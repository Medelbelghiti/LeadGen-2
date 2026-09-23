import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { ForgotPasswordSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/utils";
import { sendEmail, tplPasswordReset } from "@/lib/email";
import { env } from "@/lib/env";

export const POST = withErrorHandling(async (req) => {
  const { email } = await parseJson(req, ForgotPasswordSchema);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always return 200 to avoid revealing whether the email exists
  if (user && !user.deletedAt) {
    const token = randomToken(24);
    await db.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const link = `${env.appUrl}/reset-password?token=${token}`;
    await sendEmail({ ...tplPasswordReset(user.name, link), to: user.email });
  }
  return ok({ ok: true });
});
