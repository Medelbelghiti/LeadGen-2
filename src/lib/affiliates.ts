export const AFFILIATE_COOKIE_NAME = "lg_aff";
export interface AffiliateSettings {
  affiliate_enabled: boolean;
  commission_percentage: number;
  cookie_duration_days: number;
  minimum_payout_cents: number;
  payout_method: string;
}
export async function applyForAffiliate() { return { ok: false, error: "Affiliate program coming in V2." }; }
export async function getAffiliateByCode() { return null; }
export async function recordAffiliateClick(): Promise<void> {}
export async function attributeAffiliateOnSignup(): Promise<void> {}
export async function processAffiliateCommission(): Promise<void> {}
export async function markAffiliatePaid(): Promise<void> {}
export function buildAffiliateLink(appUrl: string, code: string): string {
  return `${appUrl}/r/${encodeURIComponent(code)}`;
}
