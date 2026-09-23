import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { CreateApiKeySchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-keys";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const items = await db.apiKey.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true, expiresAt: true, monthlyQuota: true, rateLimitPerMin: true },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, CreateApiKeySchema);
  const generated = generateApiKey();
  const created = await db.apiKey.create({
    data: {
      userId: user.id,
      name: body.name,
      prefix: generated.prefix,
      keyHash: generated.hash,
      scopes: JSON.stringify(body.scopes ?? ["search:read", "search:write", "leads:read"]),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });
  return ok({ id: created.id, prefix: created.prefix, rawKey: generated.raw });
});
