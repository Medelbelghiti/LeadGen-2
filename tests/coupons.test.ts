import { describe, it, expect } from "vitest";

function isValidCouponInput(code: unknown, value: unknown, type: unknown): boolean {
  if (typeof code !== "string" || code.length < 1 || code.length > 40) return false;
  if (type !== "PERCENT" && type !== "FIXED") return false;
  if (typeof value !== "number" || value < 1) return false;
  return true;
}

describe("coupon input validation", () => {
  it("rejects empty code", () => {
    expect(isValidCouponInput("", 10, "PERCENT")).toBe(false);
  });
  it("rejects invalid type", () => {
    expect(isValidCouponInput("X", 10, "OTHER")).toBe(false);
  });
  it("rejects zero value", () => {
    expect(isValidCouponInput("X", 0, "PERCENT")).toBe(false);
  });
  it("accepts valid input", () => {
    expect(isValidCouponInput("EARLYBIRD", 30, "PERCENT")).toBe(true);
    expect(isValidCouponInput("LAUNCH10", 1000, "FIXED")).toBe(true);
  });
});

describe("coupon code normalization", () => {
  const norm = (s: string) => s.trim().toUpperCase();
  it("uppercases and trims", () => {
    expect(norm("  earlybird  ")).toBe("EARLYBIRD");
  });
  it("preserves numbers", () => {
    expect(norm("LAUNCH10")).toBe("LAUNCH10");
  });
});
