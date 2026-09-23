"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApiKeysClient() {
  const router = useRouter();
  const [name, setN] = useState("");
  const [raw, setRaw] = useState<string | null>(null);
  const [busy, setB] = useState(false);
  const [err, setE] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setB(true);
    setE(null);
    const r = await fetch("/api/apikeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setB(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setE(j.error || "Failed");
      return;
    }
    const j = await r.json();
    setRaw(j.rawKey);
    setN("");
    router.refresh();
  };

  return (
    <form onSubmit={create} className="mt-3 space-y-3">
      <div>
        <label className="label">Key name</label>
        <input className="input" required value={name} onChange={(e) => setN(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "…" : "Create key"}</button>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {raw && (
        <div className="card border-yellow-300 bg-yellow-50">
          <p className="font-semibold text-sm">Save this key now — it won't be shown again</p>
          <pre className="text-xs bg-white p-2 mt-1 rounded border break-all">{raw}</pre>
        </div>
      )}
    </form>
  );
}
