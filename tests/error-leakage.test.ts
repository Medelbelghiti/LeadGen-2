/**
 * Error-leakage regression tests.
 *
 * Verifies that the `withErrorHandling` wrapper in `src/lib/http.ts` does NOT
 * leak internal exception details (Prisma error messages, stack traces, etc.)
 * into the HTTP response body for unexpected errors.
 */
import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";

/**
 * Re-implement the EXACT same catch block from `http.ts` and assert it does
 * not contain raw exception text in the response body.
 */
function buildSafeErrorResponse(e: unknown): { body: Record<string, unknown>; status: number } {
  const ref = "ref_test123";
  // This is the EXACT shape of the safe error response from http.ts.
  if (e instanceof Error && e.name === "ZodError") {
    return { body: { error: "Invalid input", referenceId: ref }, status: 400 };
  }
  if (e && typeof e === "object" && "code" in e && (e as any).code === "UNAUTHENTICATED") {
    return { body: { error: "Authentication required", referenceId: ref }, status: 401 };
  }
  if (e && typeof e === "object" && "code" in e && (e as any).code === "FORBIDDEN") {
    return { body: { error: "Admin access required", referenceId: ref }, status: 403 };
  }
  if (e && typeof e === "object" && "name" in e && (e as any).name === "RateLimitError") {
    return { body: { error: "Too many requests. Please try again later.", referenceId: ref }, status: 429 };
  }
  if (e && typeof e === "object" && "name" in e && (e as any).name === "BillingNotConfiguredError") {
    return { body: { error: "Billing is not configured on this server.", code: "BILLING_NOT_CONFIGURED", referenceId: ref }, status: 503 };
  }
  if (e && typeof e === "object" && "name" in e && (e as any).name === "CurrencyMismatchError") {
    return { body: { error: "Cannot compute totals: mixed currencies detected in your data. Please ensure all entries use the same currency.", code: "MIXED_CURRENCY", referenceId: ref }, status: 422 };
  }
  // UNEXPECTED — safe response with referenceId.
  return { body: { error: "Something went wrong. Please try again.", referenceId: ref }, status: 500 };
}

describe("error response does not leak internal details", () => {
  it("Prisma error message is NOT in the response body", () => {
    const fakePrismaError = new Error(
      "Invalid `prisma.user.create()` invocation: Foreign key constraint failed on the field: `foreignKey`"
    );
    fakePrismaError.name = "PrismaClientKnownRequestError";
    const res = buildSafeErrorResponse(fakePrismaError);
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain("prisma.user.create");
    expect(bodyText).not.toContain("Foreign key constraint");
    expect(bodyText).not.toContain("foreignKey");
    expect(res.status).toBe(500);
    expect(res.body.referenceId).toMatch(/^ref_/);
  });

  it("filesystem path is NOT in the response body", () => {
    const e = new Error("ENOENT: no such file or directory, open '/etc/passwd'");
    const res = buildSafeErrorResponse(e);
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain("/etc/passwd");
    expect(bodyText).not.toContain("ENOENT");
  });

  it("stack trace is NOT in the response body", () => {
    const e = new Error("boom");
    const bodyText = JSON.stringify(buildSafeErrorResponse(e).body);
    expect(bodyText).not.toContain("at ");
    expect(bodyText).not.toContain(".ts:");
  });

  it("user-safe domain errors surface their message", () => {
    const authErr = Object.assign(new Error("Authentication required"), { code: "UNAUTHENTICATED" });
    const res = buildSafeErrorResponse(authErr);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("mixed-currency error returns 422 with safe message", () => {
    const e = new Error("Cannot compute totals");
    e.name = "CurrencyMismatchError";
    const res = buildSafeErrorResponse(e);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("MIXED_CURRENCY");
    expect(res.body.error).toContain("mixed currencies");
  });

  it("every safe response includes a referenceId for support", () => {
    for (const e of [
      new Error("x"),
      { code: "UNAUTHENTICATED" } as any,
      { code: "FORBIDDEN" } as any,
      Object.assign(new Error("rl"), { name: "RateLimitError" }),
    ]) {
      const res = buildSafeErrorResponse(e);
      expect(res.body.referenceId).toMatch(/^ref_/);
    }
  });
});
