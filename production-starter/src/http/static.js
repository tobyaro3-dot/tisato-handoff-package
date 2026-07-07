import { createReadStream, promises as fs } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { config } from "../config.js";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".xml": "application/xml; charset=utf-8",
};

function getSafePath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(config.publicDir, `.${decodeURIComponent(requested)}`);
  const relativePath = relative(config.publicDir, filePath);
  if (relativePath.startsWith("..") || relativePath.includes("..\\")) return null;
  return filePath;
}

async function findStaticFile(pathname) {
  const filePath = getSafePath(pathname);
  if (!filePath) return null;

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) return filePath;
  } catch {
    // Try clean URL fallback below.
  }

  if (extname(pathname)) return null;

  const indexPath = getSafePath(`${pathname.replace(/\/$/, "")}/index.html`);
  if (indexPath) {
    try {
      const stat = await fs.stat(indexPath);
      if (stat.isFile()) return indexPath;
    } catch {
      // Try clean .html fallback below.
    }
  }

  const htmlPath = getSafePath(`${pathname}.html`);
  if (!htmlPath) return null;

  try {
    const stat = await fs.stat(htmlPath);
    if (stat.isFile()) return htmlPath;
  } catch {
    return null;
  }

  return null;
}

export async function serveStatic(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  const url = new URL(request.url, config.publicOrigin);
  const filePath = await findStaticFile(url.pathname);
  if (!filePath) return false;
  const stat = await fs.stat(filePath);
  const contentType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
  const baseHeaders = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300",
    "Accept-Ranges": "bytes",
  };
  const range = request.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, {
        ...baseHeaders,
        "Content-Range": `bytes */${stat.size}`,
      });
      response.end();
      return true;
    }

    const requestedStart = match[1] === "" ? null : Number(match[1]);
    const requestedEnd = match[2] === "" ? null : Number(match[2]);
    const suffixLength = requestedStart === null ? requestedEnd : null;
    const start = suffixLength === null ? requestedStart : Math.max(stat.size - suffixLength, 0);
    const end = requestedEnd === null || requestedStart === null ? stat.size - 1 : requestedEnd;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= stat.size || start > end) {
      response.writeHead(416, {
        ...baseHeaders,
        "Content-Range": `bytes */${stat.size}`,
      });
      response.end();
      return true;
    }

    response.writeHead(206, {
      ...baseHeaders,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    });

    if (request.method === "HEAD") {
      response.end();
      return true;
    }

    createReadStream(filePath, { start, end }).pipe(response);
    return true;
  }

  response.writeHead(200, {
    ...baseHeaders,
    "Content-Length": stat.size,
  });

  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}
