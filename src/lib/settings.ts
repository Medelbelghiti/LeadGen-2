import { db } from "./db";
import { safeJsonParse } from "./utils";

/**
 * Database-backed, admin-configurable settings.
 * Every value has a code-level default so the app boots without seed data,
 * but administrators can change anything at runtime via /admin/settings.
 */

export interface TrialSettings {
  trial_enabled: boolean;
  trial_duration_days: number;
  trial_lead_limit: number;
  trial_export_limit: number;
  trial_search_limit: number;
}

export interface ReferralSettings {
  referral_enabled: boolean;
  referral_reward_type: "LEADS_BONUS" | "COMMISSION_PERCENT" | "PLAN_MONTH";
  referral_reward_value: number; // leads count | percent | plan key index
  referral_reward_plan_key: string; // used when type = PLAN_MONTH
  referral_commission_percent: number;
}

export interface AffiliateSettings {
  affiliate_enabled: boolean;
  commission_percentage: number;
  cookie_duration_days: number;
  minimum_payout_cents: number;
  payout_method: string;
}

export interface CostControlSettings {
  max_requests_per_search: number;
  max_results_hard_cap: number;
  daily_provider_request_limit: number;
  monthly_provider_request_limit: number;
}

const DEFAULTS: Record<string, string> = {
  // Trial
  trial_enabled: "true",
  trial_duration_days: "7",
  trial_lead_limit: "100",
  trial_export_limit: "50",
  trial_search_limit: "10",
  // Referral
  referral_enabled: "true",
  referral_reward_type: "LEADS_BONUS",
  referral_reward_value: "100",
  referral_reward_plan_key: "pro",
  referral_commission_percent: "10",
  // Affiliate
  affiliate_enabled: "true",
  commission_percentage: "20",
  cookie_duration_days: "30",
  minimum_payout_cents: "5000",
  payout_method: "paypal",
  // Cost control
  max_requests_per_search: "20",
  max_results_hard_cap: "10000",
  daily_provider_request_limit: "2000",
  monthly_provider_request_limit: "20000",
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

export async function getTrialSettings(): Promise<TrialSettings> {
  const s = await getAllSettings();
  return {
    trial_enabled: s.trial_enabled === "true",
    trial_duration_days: num(s.trial_duration_days, 7),
    trial_lead_limit: num(s.trial_lead_limit, 100),
    trial_export_limit: num(s.trial_export_limit, 50),
    trial_search_limit: num(s.trial_search_limit, 10),
  };
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const s = await getAllSettings();
  const t = s.referral_reward_type;
  return {
    referral_enabled: s.referral_enabled === "true",
    referral_reward_type:
      t === "COMMISSION_PERCENT" || t === "PLAN_MONTH" ? t : "LEADS_BONUS",
    referral_reward_value: num(s.referral_reward_value, 100),
    referral_reward_plan_key: s.referral_reward_plan_key || "pro",
    referral_commission_percent: num(s.referral_commission_percent, 10),
  };
}

export async function getAffiliateSettings(): Promise<AffiliateSettings> {
  const s = await getAllSettings();
  return {
    affiliate_enabled: s.affiliate_enabled === "true",
    commission_percentage: num(s.commission_percentage, 20),
    cookie_duration_days: num(s.cookie_duration_days, 30),
    minimum_payout_cents: num(s.minimum_payout_cents, 5000),
    payout_method: s.payout_method || "paypal",
  };
}

export async function getCostControlSettings(): Promise<CostControlSettings> {
  const s = await getAllSettings();
  return {
    max_requests_per_search: num(s.max_requests_per_search, 20),
    max_results_hard_cap: num(s.max_results_hard_cap, 10000),
    daily_provider_request_limit: num(s.daily_provider_request_limit, 2000),
    monthly_provider_request_limit: num(s.monthly_provider_request_limit, 20000),
  };
}

export function parseJsonSetting<T>(value: string, fallback: T): T {
  return safeJsonParse(value, fallback);
}
