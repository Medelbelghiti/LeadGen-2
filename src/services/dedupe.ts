import type { NormalizedLead } from "./normalize";

export interface DedupeResult {
  leads: NormalizedLead[];
  duplicatesRemoved: number;
}

/**
 * Merge cross-provider records that refer to the same business.
 *
 * Strong signals (weight ≥ 0.8):
 *   - identical E.164 phone
 *   - identical domain
 *   - identical (source, sourceId)
 *
 * Supporting signals:
 *   - name similarity (Jaccard on lower-cased tokens, ≥ 0.7)
 *   - coordinate distance < ~150m
 *   - city + address match
 *
 * Records are never merged on name similarity alone.
 */
export function deduplicate(leads: NormalizedLead[]): DedupeResult {
  const clusters: NormalizedLead[][] = [];
  const representatives: NormalizedLead[] = [];

  for (const lead of leads) {
    let matchedIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < representatives.length; i++) {
      const score = similarity(representatives[i], lead);
      if (score > bestScore) {
        bestScore = score;
        matchedIndex = i;
      }
    }

    if (matchedIndex >= 0 && bestScore >= 0.8) {
      clusters[matchedIndex].push(lead);
      representatives[matchedIndex] = merge(representatives[matchedIndex], clusters[matchedIndex]);
    } else {
      clusters.push([lead]);
      representatives.push(lead);
    }
  }

  return {
    leads: representatives,
    duplicatesRemoved: leads.length - representatives.length,
  };
}

export function similarity(a: NormalizedLead, b: NormalizedLead): number {
  let score = 0;

  if (a.phone && b.phone && a.phone === b.phone) score += 1.0;
  if (a.domain && b.domain && a.domain === b.domain) score += 1.0;
  if (
    a.sourceId &&
    b.sourceId &&
    a.source === b.source &&
    a.sourceId === b.sourceId
  )
    score += 1.0;

  if (score >= 1.0) return 1;

  const nameScore = jaccard(tokenize(a.businessName), tokenize(b.businessName));
  if (nameScore >= 0.7) score += 0.4 * nameScore;

  if (a.latitude != null && b.latitude != null && a.longitude != null && b.longitude != null) {
    const d = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    if (d < 0.15) score += 0.6;
    else if (d < 0.5) score += 0.3;
  }

  if (a.city && b.city && a.city === b.city && a.address && b.address && a.address === b.address)
    score += 0.3;

  return score;
}

function merge(rep: NormalizedLead, cluster: NormalizedLead[]): NormalizedLead {
  return cluster.reduce((acc, cur) => ({
    ...acc,
    ...(cur.phoneVerified && !acc.phoneVerified ? { phone: cur.phone, phoneVerified: true } : {}),
    ...(cur.website && !acc.website ? { website: cur.website, domain: cur.domain } : {}),
    ...(cur.email && !acc.email ? { email: cur.email } : {}),
    ...(cur.address && !acc.address ? { address: cur.address } : {}),
    ...(cur.latitude != null && acc.latitude == null ? { latitude: cur.latitude, longitude: cur.longitude } : {}),
    ...(cur.rating != null && acc.rating == null ? { rating: cur.rating, reviewCount: cur.reviewCount } : {}),
    ...(cur.openingHours && !acc.openingHours ? { openingHours: cur.openingHours } : {}),
    businessName: acc.businessName,
    source: acc.source,
    sourceId: acc.sourceId,
  }), rep);
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\u4E00-\u9FFF\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  return intersect / (a.size + b.size - intersect);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
