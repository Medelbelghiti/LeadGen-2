"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExportsPage() {
  const router = useRouter();
  const [format, setFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [country, setCountry] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exports, setExports] = useState<{ id: string; format: string; rowCount: number; createdAt: string }[]>([]);

  const refresh = async () => {
    const r = await fetch("/api/export");
    if (r.ok) {
      const j = await r.json();
      setExports(j.items);
    }
  };

  // initial load
  useState(() => { void refresh(); });

  const exportNow = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        filters: {
          status: status || undefined,
          source: source || undefined,
          country: country || undefined,
          tag: tag || undefined,
        },
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Export failed");
      setLoading(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadgen-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setLoading(false);
    void refresh();
    router.refresh();
  };

  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Exports</h1>

      <div className="card mt-4">
        <p className="font-semibold">New export</p>
        <div className="grid md:grid-cols-5 gap-2 mt-2 text-sm">
          <select className="select" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "xlsx" | "json")}>
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="json">JSON</option>
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input className="input" placeholder="Source (e.g. openstreetmap)" value={source} onChange={(e) => setSource(e.target.value)} />
          <input className="input" placeholder="Country code (e.g. MA)" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
          <input className="input" placeholder="Tag" value={tag} onChange={(e) => setTag(e.target.value)} />
        </div>
        <button onClick={exportNow} disabled={loading} className="btn btn-primary mt-3">
          {loading ? "Generating…" : "Generate export"}
        </button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Recent exports</p>
        {exports.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No exports yet.</p>
        ) : (
          <table className="basic mt-2">
            <thead><tr><th>Format</th><th>Rows</th><th>Created</th></tr></thead>
            <tbody>
              {exports.map((e) => (
                <tr key={e.id}><td>{e.format}</td><td>{e.rowCount}</td><td>{new Date(e.createdAt).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
