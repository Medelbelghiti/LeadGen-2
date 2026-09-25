/**
 * Authorization helper regression tests.
 * `assertOwnership` is the central BOLA guard. It must throw AuthError(FORBIDDEN)
 * when a user tries to access another user's resource.
 */
import { describe, it, expect } from "vitest";
import { AuthError, assertOwnership } from "@/lib/auth";

describe("assertOwnership (BOLA guard)", () => {
  it("allows access when userId matches", () => {
    const user = { id: "u1", email: "a@a.com", passwordHash: "x", name: null, role: "USER", locale: "en", country: null, currency: "USD", distanceUnit: "km", fuelUnit: "L_PER_100KM", stripeCustomerId: null, planId: null, trialEndsAt: null, trialUsed: false, referralCode: "X", bonusLeads: 0, referredById: null, failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: null, signupIp: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, emailVerifiedAt: null } as any;
    expect(() => assertOwnership("u1", user)).not.toThrow();
  });

  it("throws AuthError(FORBIDDEN) when userId differs", () => {
    const user = { id: "u1" } as any;
    try {
      assertOwnership("u2", user);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).code).toBe("FORBIDDEN");
    }
  });

  it("admin role bypasses ownership check", () => {
    const admin = { id: "admin1", role: "ADMIN" } as any;
    expect(() => assertOwnership("user-xyz", admin)).not.toThrow();
  });
});
