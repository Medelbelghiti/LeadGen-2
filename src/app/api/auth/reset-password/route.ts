import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { ResetPasswordSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { hashPassword, destroySession } from "@/lib/auth";
import { sha256 } from "@/lib/utils";
import { auditLog } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  const { token, password } = await parseJson(req, ResetPasswordSchema);
  const tokenHash = sha256(token);
  const row = await db.verificationToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== "PASSWORD_RESET" || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  await db.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await db.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  destroySession();
  await auditLog({ userId: row.userId, action: "password.reset" });
  return ok({ ok: true });
});
