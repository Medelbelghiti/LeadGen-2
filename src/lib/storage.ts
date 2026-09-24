import { randomToken } from "./utils";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), "uploads");

export async function ensureDir(dir: string): Promise<void> { await fs.mkdir(dir, { recursive: true }); }

export async function saveFile(prefix: string, ext: string, bytes: Buffer): Promise<{ storageKey: string; sizeBytes: number }> {
  await ensureDir(STORAGE_DIR);
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const key = prefix + "/" + randomToken(16) + "." + safeExt;
  const fullPath = path.join(STORAGE_DIR, key);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, bytes);
  return { storageKey: key, sizeBytes: bytes.length };
}

export async function readFile(storageKey: string): Promise<Buffer> {
  const safe = storageKey.replace(/\.\.\//g, "");
  const fullPath = path.join(STORAGE_DIR, safe);
  return fs.readFile(fullPath);
}

export async function deleteFile(storageKey: string): Promise<void> {
  const safe = storageKey.replace(/\.\.\//g, "");
  try { await fs.unlink(path.join(STORAGE_DIR, safe)); } catch { /* idempotent */ }
}

export const ALLOWED_MIME_TYPES = new Set(["image/jpeg","image/png","image/webp","image/heic","application/pdf"]);
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateUpload(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) return "Unsupported file type: " + (file.type || "unknown");
  if (file.size > MAX_BYTES) return "File too large (max " + (MAX_BYTES / 1024 / 1024) + " MB)";
  if (file.size <= 0) return "Empty file";
  return null;
}
