import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["createdAt", "businessName", "city", "dataQualityScore"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const GET = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const search = await db.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(search.userId, user);

  const url = new URL(req.url);
  const q = QuerySchema.parse(Object.fromEntries(url.searchParams));
  const [total, items] = await Promise.all([
    db.lead.count({ where: { searchId: id } }),
    db.lead.findMany({
      where: { searchId: id },
      orderBy: { [q.sort]: q.order },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return ok({ total, page: q.page, pageSize: q.pageSize, items });
});

void parseJson;
