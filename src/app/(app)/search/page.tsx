"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SUGGESTIONS = [
  "Dentists", "Restaurants", "Solar panel installers", "Plumbers",
  "Software companies", "Real estate agencies", "Coworking spaces",
  "AI consulting", "Dental implant specialists", "Luxury yacht brokers",
  "Organic cosmetics manufacturers", "Industrial valve suppliers",
];

const COUNTRIES = [
  { code: "MA", name: "Morocco" }, { code: "FR", name: "France" }, { code: "US", name: "United States" },
  { code: "CA", name: "Canada" }, { code: "GB", name: "United Kingdom" }, { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" }, { code: "DE", name: "Germany" }, { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" }, { code: "CH", name: "Switzerland" },
  { code: "AE", name: "UAE" }, { code: "SA", name: "Saudi Arabia" }, { code: "QA", name: "Qatar" },
  { code: "EG", name: "Egypt" }, { code: "TR", name: "Turkey" }, { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" }, { code: "CN", name: "China" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "SG", name: "Singapore" }, { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" }, { code: "AU", name: "Australia" }, { code: "NZ", name: "New Zealand" },
  { code: "BR", name: "Brazil" }, { code: "MX", name: "Mexico" }, { code: "AR", name: "Argentina" },
  { code: "ZA", name: "South Africa" }, { code: "NG", name: "Nigeria" }, { code: "KE", name: "Kenya" },
];

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [maxResults, setMaxResults] = useState(50);
  const [providers, setProviders] = useState<string[]>(["openstreetmap", "google"]);
  const [useDemo, setUseDemo] = useState(params.get("demo") === "1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (niche.length < 2) return setSuggestions([]);
    const lc = niche.toLowerCase();
    setSuggestions(
      SUGGESTIONS.filter((s) => s.toLowerCase().includes(lc) && s.toLowerCase() !== lc).slice(0, 5)
    );
  }, [niche]);

  const toggleProvider = (p: string) =>
    setProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche,
        keywords: keywords || undefined,
        location,
        countryCode: country || undefined,
        countryName: country ? COUNTRIES.find((c) => c.code === country)?.name : undefined,
        radiusKm: radius,
        maxResults,
        providers,
        useDemo,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Search failed");
      return;
    }
    const data = await res.json();
    router.push(`/search/${data.searchId}`);
  };

  return (
    <div className="container-app max-w-3xl">
      <h1 className="text-2xl font-bold">Search leads</h1>
      <p className="text-sm text-slate-600">
        Enter any business niche in any country. LeadGen 2.0 returns the maximum legitimate results available
        across its configured providers.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Business niche</label>
          <input
            className="input"
            required
            placeholder="e.g. Dentists, Solar panel installers, AI consulting"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            list="niche-suggestions"
          />
          <datalist id="niche-suggestions">
            {SUGGESTIONS.map((s) => (<option key={s} value={s} />))}
          </datalist>
          {suggestions.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">Suggestions: {suggestions.join(", ")}</p>
          )}
        </div>

        <div>
          <label className="label">Keywords (optional)</label>
          <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Country</label>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">— Worldwide —</option>
              {COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" required placeholder="City, region or postal code" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Radius (km)</label>
            <input className="input" type="number" min={1} max={500} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Max results</label>
            <input className="input" type="number" min={1} max={10000} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Demo mode</label>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" checked={useDemo} onChange={(e) => setUseDemo(e.target.checked)} />
              Use synthetic labeled data
            </label>
          </div>
        </div>

        <div>
          <label className="label">Providers</label>
          <div className="flex gap-3 flex-wrap mt-1 text-sm">
            {["openstreetmap", "google", "demo"].map((p) => (
              <label key={p} className="flex items-center gap-1">
                <input type="checkbox" checked={providers.includes(p)} onChange={() => toggleProvider(p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Searching…" : "Start search"}
        </button>
      </form>
    </div>
  );
}
