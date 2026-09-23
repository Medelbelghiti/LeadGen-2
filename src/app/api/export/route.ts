import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { ExportRequestSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getEntitlements, LimitReachedError } from "@/lib/plans";
import { recordUsage } from "@/lib/usage";
import { toCsv, toXlsx, toJson, contentType, type ExportableLead } from "@/services/export";
import { trackEvent } from "@/lib/analytics";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const list = await db.export.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ items: list });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, ExportRequestSchema);
  const ent = await getEntitlements(user);

  const where: Record<string, unknown> = { userId: user.id };
  if (body.leadIds && body.leadIds.length > 0) where.id = { in: body.leadIds };
  if (body.searchId) where.searchId = body.searchId;
  if (body.filters?.status) where.status = body.filters.status;
  if (body.filters?.country) where.countryCode = body.filters.country;
  if (body.filters?.source) where.source = body.filters.source;
  if (body.filters?.tag) where.tags = { contains: `"${body.filters.tag}"` };

  const all = await db.lead.findMany({ where, orderBy: { createdAt: "desc" } });
  if (all.length > ent.exportLimit) {
    throw new LimitReachedError("exports", `Export exceeds your plan limit of ${ent.exportLimit} rows`);
  }

  const exportable: ExportableLead[] = all.map((l) => ({
    businessName: l.businessName,
    category: l.category,
    subcategory: l.subcategory,
    description: l.description,
    phone: l.phone,
    internationalPhone: l.internationalPhone,
    email: l.email,
    website: l.website,
    domain: l.domain,
    address: l.address,
    street: l.street,
    city: l.city,
    region: l.region,
    postalCode: l.postalCode,
    country: l.country,
    latitude: l.latitude,
    longitude: l.longitude,
    rating: l.rating,
    reviewCount: l.reviewCount,
    source: l.source,
    sourceUrl: l.sourceUrl,
    dataQualityScore: l.dataQualityScore,
    status: l.status,
    tags: safeParseTags(l.tags),
    notes: l.notes,
    collectedAt: l.collectedAt,
  }));

  await recordUsage({
    userId: user.id,
    action: "EXPORT",
    quantity: exportable.length,
    planKey: ent.planKey,
    periodKey: ent.periodKey,
  });

  await db.export.create({
    data: {
      userId: user.id,
      searchId: body.searchId ?? null,
      format: body.format,
      rowCount: exportable.length,
      filterJson: body.filters ? JSON.stringify(body.filters) : null,
    },
  });

  await trackEvent("export_created", { userId: user.id, metadata: { count: exportable.length, format: body.format } });

  let payload: string | Buffer;
  let filename = `leadgen-export-${Date.now()}.${body.format}`;
  switch (body.format) {
    case "csv":
      payload = toCsv(exportable);
      break;
    case "xlsx":
      payload = toXlsx(exportable);
      break;
    case "json":
      payload = toJson(exportable);
      break;
  }

  return new NextResponse(payload as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType(body.format),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

function safeParseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}
