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

  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "public, max-age=300",
  });

  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}
