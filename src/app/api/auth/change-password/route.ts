import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { ChangePasswordSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = await parseJson(req, ChangePasswordSchema);
  const okPw = await verifyPassword(currentPassword, user.passwordHash);
  if (!okPw) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await auditLog({ userId: user.id, action: "password.changed" });
  return ok({ ok: true });
});
