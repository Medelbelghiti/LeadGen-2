import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      deletedAt: new Date(),
      email: `deleted-${user.id}@deleted.local`,
      name: null,
      stripeCustomerId: null,
    },
  });
  await db.apiKey.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await auditLog({ userId: user.id, action: "account.deleted" });
  destroySession();
  return ok({ ok: true });
});
