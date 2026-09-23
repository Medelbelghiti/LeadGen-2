import { NextResponse } from "next/server";
import { getAffiliateByCode, recordAffiliateClick, AFFILIATE_COOKIE_NAME } from "@/lib/affiliates";
import { getAffiliateSettings } from "@/lib/settings";

/** Public route to attribute affiliate clicks. */
export const GET = async (req: Request, ctx: { params: { code: string } }): Promise<Response> => {
  const settings = await getAffiliateSettings();
  if (!settings.affiliate_enabled) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const aff = await getAffiliateByCode(ctx.params.code);
  if (!aff || aff.status !== "APPROVED") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  await recordAffiliateClick(aff.id, ip, ua);
  const url = new URL(`/signup?aff=${ctx.params.code}`, req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(AFFILIATE_COOKIE_NAME, ctx.params.code, {
    httpOnly: false,
    maxAge: settings.cookie_duration_days * 24 * 60 * 60,
    path: "/",
  });
  return res;
};
