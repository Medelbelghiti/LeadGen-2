import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
  source: z.string().optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(["createdAt", "businessName", "city", "dataQualityScore"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const GET = withErrorHandling(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const q = QuerySchema.parse(Object.fromEntries(url.searchParams));

  const where: Record<string, unknown> = { userId: user.id };
  if (q.status) where.status = q.status;
  if (q.source) where.source = q.source;
  if (q.country) where.countryCode = q.country.toUpperCase();
  if (q.tag) where.tags = { contains: `"${q.tag}"` };
  if (q.search) {
    where.OR = [
      { businessName: { contains: q.search } },
      { city: { contains: q.search } },
      { country: { contains: q.search } },
      { phone: { contains: q.search } },
    ];
  }

  const [total, items] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { [q.sort]: q.order },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return ok({ total, page: q.page, pageSize: q.pageSize, items });
});
