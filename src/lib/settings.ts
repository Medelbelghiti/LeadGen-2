import { db } from "./db";
import { safeJsonParse } from "./utils";

const DEFAULTS: Record<string, string> = {
  trial_enabled: "true",
  trial_duration_days: "14",
  trial_lead_limit: "200",
  default_currency: "USD",
  default_distance_unit: "km",
  default_fuel_unit: "L_PER_100KM",
  affiliate_enabled: "false",
  affiliate_commission_percent: "20",
  affiliate_cookie_days: "30",
  affiliate_min_payout_cents: "5000",
  affiliate_payout_method: "paypal",
  referral_enabled: "false",
  referral_reward_type: "PLAN_MONTH",
  referral_reward_plan_key: "pro",
  referral_reward_value: "1",
};

let cache: { at: number; values: Record<string, string> } | null = null;
const CACHE_TTL_MS = 15_000;

export async function getSetting(key: string): Promise<string> {
  const all = await getAllSettings();
  return all[key] ?? DEFAULTS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const rows = await db.setting.findMany();
  const values: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) values[r.key] = r.value;
  cache = { at: Date.now(), values };
  return values;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  cache = null;
}

export function clearSettingsCache(): void {
  cache = null;
}

function num(v: string, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface TrialSettings {
  trial_enabled: boolean;
  trial_duration_days: number;
  trial_lead_limit: number;
}

export async function getTrialSettings(): Promise<TrialSettings> {
  const s = await getAllSettings();
  return {
    trial_enabled: s.trial_enabled === "true",
    trial_duration_days: num(s.trial_duration_days, 14),
    trial_lead_limit: num(s.trial_lead_limit, 200),
  };
}

export async function getReferralSettings() {
  const s = await getAllSettings();
  const t = s.referral_reward_type;
  return {
    referral_enabled: s.referral_enabled === "true",
    referral_reward_type: (t === "COMMISSION_PERCENT" || t === "PLAN_MONTH" ? t : "PLAN_MONTH") as "COMMISSION_PERCENT" | "PLAN_MONTH",
    referral_reward_value: num(s.referral_reward_value, 1),
    referral_reward_plan_key: s.referral_reward_plan_key || "pro",
    referral_commission_percent: num(s.referral_commission_percent, 0),
  };
}

export async function getAffiliateSettings() {
  const s = await getAllSettings();
  return {
    affiliate_enabled: s.affiliate_enabled === "true",
    commission_percentage: num(s.affiliate_commission_percent, 20),
    cookie_duration_days: num(s.affiliate_cookie_days, 30),
    minimum_payout_cents: num(s.affiliate_min_payout_cents, 5000),
    payout_method: s.affiliate_payout_method || "paypal",
  };
}

export function parseJsonSetting<T>(value: string, fallback: T): T {
  return safeJsonParse(value, fallback);
}
