import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { generateApiKey, hashApiKey, API_KEY_PREFIX } from "@/lib/api-keys";

describe("API keys", () => {
  it("generateApiKey returns raw, prefix, and hash", () => {
    const k = generateApiKey();
    expect(k.raw.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(k.prefix.length).toBe(8);
    expect(k.hash.length).toBe(64);
  });
  it("hashApiKey is deterministic and depends on the env secret", () => {
    const raw = "lgk_test";
    const h1 = hashApiKey(raw);
    const h2 = hashApiKey(raw);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });
  it("hash differs from raw input", () => {
    expect(hashApiKey("hello")).not.toBe(crypto.createHash("sha256").update("hello").digest("hex"));
  });
});
