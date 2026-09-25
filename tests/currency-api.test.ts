/**
 * Currency validation tests for the centralized SUPPORTED_CURRENCIES list.
 * The previous "z.string().min(3).max(3)" validator accepted arbitrary 3-letter
 * codes like "XXX", "ABC", "banana" (5 letters were rejected but "XXX" was allowed).
 *
 * The new validator is an enum: only USD/EUR/MAD/GBP/CAD are accepted.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from "@/lib/currency";

const CurrencySchema = z.enum(SUPPORTED_CURRENCIES);

describe("centralized currency validation", () => {
  it("accepts every supported currency", () => {
    for (const c of SUPPORTED_CURRENCIES) {
      expect(() => CurrencySchema.parse(c)).not.toThrow();
      expect(isSupportedCurrency(c)).toBe(true);
    }
  });

  it("rejects arbitrary 3-letter codes", () => {
    for (const bad of ["XXX", "ABC", "ZZZ", "FOO", "BAR"]) {
      expect(() => CurrencySchema.parse(bad)).toThrow();
      expect(isSupportedCurrency(bad)).toBe(false);
    }
  });

  it("rejects lowercase / mixed-case", () => {
    expect(() => CurrencySchema.parse("usd")).toThrow();
    expect(() => CurrencySchema.parse("Usd")).toThrow();
  });

  it("rejects empty string, too-short, too-long", () => {
    expect(() => CurrencySchema.parse("")).toThrow();
    expect(() => CurrencySchema.parse("U")).toThrow();
    expect(() => CurrencySchema.parse("USDD")).toThrow();
  });

  it("rejects non-strings", () => {
    expect(() => CurrencySchema.parse(null as unknown as string)).toThrow();
    expect(() => CurrencySchema.parse(123 as unknown as string)).toThrow();
  });
});
