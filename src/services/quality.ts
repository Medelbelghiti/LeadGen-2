import type { NormalizedLead } from "./normalize";

/**
 * Data Quality Score (0–100). Measures completeness, NOT business quality.
 * Returns the score and a list of which fields are missing so the UI can explain it.
 */
export interface QualityResult {
  score: number;
  missing: string[];
}

export function computeQuality(lead: NormalizedLead): QualityResult {
  let score = 0;
  const missing: string[] = [];

  if (lead.businessName && lead.businessName !== "Unknown business") score += 20; else missing.push("Business name");
  if (lead.internationalPhone) score += 20; else missing.push("Phone");
  if (lead.website) score += 15; else missing.push("Website");
  if (lead.address) score += 15; else missing.push("Address");
  if (lead.city && lead.country) score += 10; else missing.push("City/Country");
  if (lead.latitude != null && lead.longitude != null) score += 10; else missing.push("Coordinates");
  if (lead.source) score += 5; else missing.push("Source");
  const verifiedCount = [lead.phoneVerified, !!lead.website, !!lead.email].filter(Boolean).length;
  score += Math.min(5, verifiedCount * 2);

  return { score: Math.min(100, score), missing };
}
