import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

const getKey = () => {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY must be provided as base64");
  }
  const buffer = Buffer.from(key, "base64");
  if (buffer.length < KEY_BYTES) {
    throw new Error("PII_ENCRYPTION_KEY must be at least 32 bytes after base64 decoding");
  }
  return buffer.slice(0, KEY_BYTES);
};

export type CipherPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
};

export const encryptField = (plaintext: string): CipherPayload => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    version: 1
  };
};

export const decryptField = (payload: CipherPayload): string => {
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};

export const sha256Digest = (value: string) => {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("base64");
};

export const maskEmail = (email: string) => {
  if (!email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone: string) => {
  return phone.replace(/(\+\d{1,2})\d{3}(\d+)/, "$1***$2");
};
