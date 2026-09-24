/** Stubbed — referral program is V2. */
export async function attributeReferralOnSignup(): Promise<void> {}
export async function markReferralTrial(): Promise<void> {}
export async function markReferralConverted(): Promise<void> {}
export async function getOrCreateReferralCode(): Promise<string> { return "AUTOECO-V2"; }
export function buildReferralUrl(appUrl: string, code: string): string {
  return `${appUrl}/signup?ref=${encodeURIComponent(code)}`;
}
export interface ReferralSettings {
  referral_enabled: boolean;
  referral_reward_type: "PLAN_MONTH" | "COMMISSION_PERCENT";
  referral_reward_value: number;
  referral_reward_plan_key: string;
  referral_commission_percent: number;
}
