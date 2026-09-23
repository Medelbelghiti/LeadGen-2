// These tests verify pure functions and do not touch the database.
// Run with: npm test

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client and other env-dependent modules BEFORE importing
// the modules that read them. This keeps the unit tests fast and isolated.
vi.mock("@/lib/db", () => ({
  db: {
    setting: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    featureFlag: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
  },
}));

import { getTrialSettings, getReferralSettings, getAffiliateSettings, getCostControlSettings } from "@/lib/settings";

describe("settings defaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns sensible trial defaults", async () => {
    const s = await getTrialSettings();
    expect(s.trial_enabled).toBe(true);
    expect(s.trial_duration_days).toBe(7);
    expect(s.trial_lead_limit).toBeGreaterThan(0);
    expect(s.trial_search_limit).toBeGreaterThan(0);
  });

  it("returns sensible referral defaults", async () => {
    const s = await getReferralSettings();
    expect(s.referral_enabled).toBe(true);
    expect(["LEADS_BONUS", "COMMISSION_PERCENT", "PLAN_MONTH"]).toContain(s.referral_reward_type);
  });

  it("returns sensible affiliate defaults", async () => {
    const s = await getAffiliateSettings();
    expect(s.affiliate_enabled).toBe(true);
    expect(s.commission_percentage).toBeGreaterThan(0);
    expect(s.cookie_duration_days).toBeGreaterThan(0);
  });

  it("returns sensible cost-control defaults", async () => {
    const s = await getCostControlSettings();
    expect(s.max_requests_per_search).toBeGreaterThan(0);
    expect(s.max_results_hard_cap).toBeGreaterThan(0);
  });
});
