import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { authenticateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";
import { getEntitlements, LimitReachedError } from "@/lib/plans";
import { runSearchJob } from "@/services/search-job";
import { recordUsage } from "@/lib/usage";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SearchRequestSchema } from "@/lib/schemas";

async function authenticate(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return null;
  const user = await db.user.findUnique({ where: { id: auth.userId } });
  if (!user || user.deletedAt) return null;
  return user;
}

export const POST = withErrorHandling(async (req) => {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  if (!(await isFeatureEnabled("api_access"))) {
    return NextResponse.json({ error: "API access is disabled" }, { status: 403 });
  }

  const body = await parseJson(req, SearchRequestSchema);
  const ent = await getEntitlements(user);
  if (!ent.apiAccess) {
    return NextResponse.json(
      { error: "API access is not available on your current plan" },
      { status: 403 }
    );
  }
  const requested = body.maxResults ?? 25;
  if (requested > ent.maxResultsPerSearch) {
    throw new LimitReachedError("results", `maxResults exceeds your plan limit (${ent.maxResultsPerSearch})`);
  }

  await recordUsage({
    userId: user.id,
    action: "API_REQUEST",
    planKey: ent.planKey,
    periodKey: ent.periodKey,
  });

  const job = await runSearchJob({
    userId: user.id,
    niche: body.niche,
    keywords: body.keywords,
    location: body.location,
    countryCode: body.countryCode,
    countryName: body.countryName,
    radiusKm: body.radiusKm,
    latitude: body.latitude,
    longitude: body.longitude,
    maxResults: Math.min(requested, ent.maxResultsPerSearch),
    providers: body.providers ?? ent.providers,
    useDemo: Boolean(body.useDemo),
  });
  return ok({ searchId: job.searchId, status: job.status, leads: job.leadsCount });
});
