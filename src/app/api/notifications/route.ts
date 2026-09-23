import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return ok({ items, unread });
});
