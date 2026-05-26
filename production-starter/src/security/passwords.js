import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const HASH_VERSION = "pbkdf2_sha256";
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const BCRYPT_PATTERN = /^\$2[aby]\$/;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return [
    HASH_VERSION,
    String(ITERATIONS),
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;

  if (BCRYPT_PATTERN.test(storedHash)) {
    return bcrypt.compareSync(password, storedHash);
  }

  const [version, iterationsText, saltText, hashText] = storedHash.split("$");
  if (version !== HASH_VERSION || !iterationsText || !saltText || !hashText) return false;

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;

  const expected = Buffer.from(hashText, "base64url");
  const actual = pbkdf2Sync(
    password,
    Buffer.from(saltText, "base64url"),
    iterations,
    expected.length,
    DIGEST
  );

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeCompareText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
