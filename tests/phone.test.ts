import { describe, it, expect } from "vitest";
import { normalizePhone, domainFromUrl } from "@/lib/phone";

describe("normalizePhone", () => {
  it("converts MA local to +212 E.164", () => {
    const r = normalizePhone("06 12 34 56 78", "MA");
    expect(r.e164).toBe("+212612345678");
    expect(r.valid).toBe(true);
  });
  it("converts FR local to +33 E.164", () => {
    const r = normalizePhone("06 12 34 56 78", "FR");
    expect(r.e164).toBe("+33612345678");
  });
  it("converts US format", () => {
    const r = normalizePhone("(212) 555-1234", "US");
    expect(r.e164).toBe("+12125551234");
  });
  it("returns invalid for garbage", () => {
    const r = normalizePhone("not a phone", "US");
    expect(r.valid).toBe(false);
    expect(r.e164).toBeNull();
  });
});

describe("domainFromUrl", () => {
  it("strips www and lowercases", () => {
    expect(domainFromUrl("https://WWW.Example.COM/path")).toBe("example.com");
  });
  it("handles bare domains", () => {
    expect(domainFromUrl("Example.co.uk")).toBe("example.co.uk");
  });
  it("returns null for invalid", () => {
    expect(domainFromUrl("")).toBeNull();
  });
});
