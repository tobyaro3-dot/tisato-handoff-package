import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultDataDir = process.env.VERCEL ? join(tmpdir(), "tisato-data") : join(rootDir, "data");
const localEnvPath = join(rootDir, ".env");
const defaultInternalNotificationEmails =
  "tayo@tisatotransportationservices.com,tisatotransportationservices@gmail.com";

function loadLocalEnvFile() {
  if (!existsSync(localEnvPath)) return false;

  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  return true;
}

const localEnvLoaded = loadLocalEnvFile();

export const config = {
  port: Number(process.env.PORT || 8080),
  publicOrigin: process.env.PUBLIC_ORIGIN || "http://localhost:8080",
  rootDir,
  publicDir: join(rootDir, "public"),
  dataDir: process.env.DATA_DIR || defaultDataDir,
  databaseUrl: process.env.DATABASE_URL || "",
  isVercel: Boolean(process.env.VERCEL),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  ceoNotificationEmails:
    process.env.CEO_NOTIFICATION_EMAILS ||
    process.env.CEO_NOTIFICATION_EMAIL ||
    defaultInternalNotificationEmails,
  localEnvLoaded,
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
