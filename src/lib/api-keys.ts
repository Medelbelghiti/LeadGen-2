import crypto from "crypto";
import { db } from "./db";
import { env } from "./env";

export const API_KEY_PREFIX = "lgk_";
export const API_KEY_BYTES = 24;

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(API_KEY_BYTES).toString("base64url");
  const raw = `${API_KEY_PREFIX}${random}`;
  const prefix = raw.slice(0, 8);
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

export function hashApiKey(raw: string): string {
  return crypto
    .createHmac("sha256", env.authSecret)
    .update(raw)
    .digest("hex");
}

export async function authenticateApiKey(req: Request): Promise<{
  userId: string;
  keyId: string;
  scopes: string[];
} | null> {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;
  if (!token || !token.startsWith(API_KEY_PREFIX)) return null;
  const hash = hashApiKey(token);
  const key = await db.apiKey.findUnique({
    where: { keyHash: hash },
    include: { user: true },
  });
  if (!key || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  if (key.user.deletedAt) return null;
  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    userId: key.userId,
    keyId: key.id,
    scopes: JSON.parse(key.scopes) as string[],
  };
}
