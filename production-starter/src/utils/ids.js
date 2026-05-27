import { randomUUID } from "node:crypto";

const COMPACT_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createId(prefix = "id") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const entropy = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `${prefix}_${timestamp}_${entropy}`;
}

export function createCompactBookingId() {
  const entropy = randomUUID().replaceAll("-", "").toUpperCase();
  let code = "";

  for (let index = 0; code.length < 5 && index < entropy.length; index += 2) {
    const chunk = entropy.slice(index, index + 2);
    const value = Number.parseInt(chunk, 16);
    code += COMPACT_ID_ALPHABET[value % COMPACT_ID_ALPHABET.length];
  }

  return `TIS-${code}`;
}

export function formatTimestampForFile(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}
