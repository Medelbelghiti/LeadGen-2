import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { clearSettingsCache, getAllSettings, setSetting } from "@/lib/settings";

const Schema = z.object({
  entries: z.array(z.object({ key: z.string(), value: z.string() })),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const values = await getAllSettings();
  return ok({ values });
});

export const POST = withErrorHandling(async (req) => {
  await requireAdmin();
  const body = await parseJson(req, Schema);
  for (const e of body.entries) {
    await setSetting(e.key, e.value);
  }
  clearSettingsCache();
  return ok({ ok: true });
});
