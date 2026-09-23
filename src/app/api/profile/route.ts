import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  locale: z.enum(["en", "fr", "ar"]).optional(),
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
  });
});

export const PATCH = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, UpdateSchema);
  const updated = await db.user.update({
    where: { id: user.id },
    data: body,
  });
  return ok({ id: updated.id, name: updated.name, locale: updated.locale });
});
