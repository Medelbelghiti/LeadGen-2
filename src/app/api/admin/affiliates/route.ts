import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const items = await db.affiliate.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items });
});
