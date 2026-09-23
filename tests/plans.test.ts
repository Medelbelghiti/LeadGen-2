import { describe, it, expect, vi } from "vitest";

// Mock the DB module and any imports of the schema
vi.mock("@/lib/db", () => ({
  db: {
    plan: { findFirst: vi.fn(), findUnique: vi.fn() },
    subscription: { findFirst: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/settings", () => ({
  getTrialSettings: vi.fn().mockResolvedValue({
    trial_enabled: true,
    trial_duration_days: 7,
    trial_lead_limit: 100,
    trial_export_limit: 50,
    trial_search_limit: 10,
  }),
  getReferralSettings: vi.fn(),
  getAffiliateSettings: vi.fn(),
  getCostControlSettings: vi.fn(),
  getAllSettings: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

import { getEntitlements } from "@/lib/plans";

function user(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@a.com",
    passwordHash: "x",
    name: null,
    role: "USER",
    locale: "en",
    emailVerifiedAt: null,
    stripeCustomerId: null,
    planId: null,
    trialEndsAt: null,
    trialUsed: false,
    referralCode: "LEADGEN-TEST",
    bonusLeads: 0,
    referredById: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    signupIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  } as any;
}

describe("getEntitlements", () => {
  it("returns trial entitlements when trial is active", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const ent = await getEntitlements(user({ trialEndsAt: future }));
    expect(ent.isTrial).toBe(true);
    expect(ent.planKey).toBe("trial");
    expect(ent.monthlyLeadLimit).toBe(100);
  });

  it("returns fallback free entitlements when no trial and no sub", async () => {
    const ent = await getEntitlements(user());
    expect(ent.isTrial).toBe(false);
    expect(ent.providers).toContain("demo");
    expect(ent.maxResultsPerSearch).toBeGreaterThan(0);
  });

  it("includes bonusLeads in monthly lead limit", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const ent = await getEntitlements(user({ trialEndsAt: future, bonusLeads: 250 }));
    expect(ent.monthlyLeadLimit).toBe(100 + 250);
  });
});
