import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
function key() {
  const key = Buffer.from(process.env.NIN_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32)
    throw new Error(
      "NIN_ENCRYPTION_KEY must be 32 random bytes encoded as base64.",
    );
  return key;
}
export function encryptNin(value: string, recordId: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(recordId));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function decryptNin(value: string, recordId: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1") throw new Error("Unknown NIN key version.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAAD(Buffer.from(recordId));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
