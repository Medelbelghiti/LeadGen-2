import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getFeatureFlags, setFeatureFlag } from "@/lib/feature-flags";

const Schema = z.object({ key: z.string(), enabled: z.boolean(), description: z.string().optional() });

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const flags = await getFeatureFlags();
  return ok({ flags });
});

export const POST = withErrorHandling(async (req) => {
  await requireAdmin();
  const body = await parseJson(req, Schema);
  await setFeatureFlag(body.key, body.enabled, body.description);
  return ok({ ok: true });
});
