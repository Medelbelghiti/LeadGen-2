import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/http";
import { authenticateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";

const Schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const GET = withErrorHandling(async (req) => {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const url = new URL(req.url);
  const q = Schema.parse(Object.fromEntries(url.searchParams));
  const [total, items] = await Promise.all([
    db.lead.count({ where: { userId: auth.userId } }),
    db.lead.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return ok({ total, page: q.page, pageSize: q.pageSize, items });
});
