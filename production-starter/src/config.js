import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultDataDir = process.env.VERCEL ? join(tmpdir(), "tisato-data") : join(rootDir, "data");

export const config = {
  port: Number(process.env.PORT || 8080),
  publicOrigin: process.env.PUBLIC_ORIGIN || "http://localhost:8080",
  rootDir,
  publicDir: join(rootDir, "public"),
  dataDir: process.env.DATA_DIR || defaultDataDir,
  businessName: process.env.BUSINESS_NAME || "TISATO Transportation Services INC",
  dispatchEmail: process.env.DISPATCH_EMAIL || "info@tisatotransportationservices.com",
  dispatchPhone: process.env.DISPATCH_PHONE || "+18448847286",
  adminEmail: process.env.ADMIN_EMAIL || "owner@example.com",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminSessionSecret:
    process.env.ADMIN_SESSION_SECRET || "dev-only-session-secret-change-before-production",
  adminSessionTtlMs: Number(process.env.ADMIN_SESSION_TTL_MS || 1000 * 60 * 60 * 8),
  cookieName: "tisato_admin_session",
};
