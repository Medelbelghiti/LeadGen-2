import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface PhoneResult {
  original: string;
  e164: string | null;
  national: string | null;
  countryCode: string | null; // ISO 3166-1 alpha-2
  valid: boolean;
}

export function normalizePhone(raw: string | null | undefined, defaultCountry?: string): PhoneResult {
  if (!raw) {
    return { original: "", e164: null, national: null, countryCode: null, valid: false };
  }
  const trimmed = raw.trim();
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as any);
  if (!parsed) {
    return { original: trimmed, e164: null, national: trimmed, countryCode: null, valid: false };
  }
  return {
    original: trimmed,
    e164: parsed.number,
    national: parsed.formatNational(),
    countryCode: parsed.country ?? null,
    valid: parsed.isValid(),
  };
}

export function domainFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.host.replace(/^www\./, "").toLowerCase();
  } catch {
    const m = raw.match(/^([a-z0-9.-]+\.[a-z]{2,})/i);
    return m ? m[1].toLowerCase() : null;
  }
}
