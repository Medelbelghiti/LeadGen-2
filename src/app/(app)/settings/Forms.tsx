"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Profile({ name, email, locale }: { name: string; email: string; locale: string }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [l, setL] = useState(locale);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    document.cookie = "lg_locale=" + l + "; path=/; max-age=" + 60 * 60 * 24 * 365;
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, locale: l }) });
    setBusy(false);
    setMsg(r.ok ? "Saved" : "Failed");
    if (r.ok) router.refresh();
  };

  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      <div><label className="label">Name</label><input className="input" value={n} onChange={(e) => setN(e.target.value)} /></div>
      <div><label className="label">Email</label><input className="input" value={email} disabled /></div>
      <div>
        <label className="label">Locale</label>
        <select className="select" value={l} onChange={(e) => setL(e.target.value)}>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>
      <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "..." : "Save"}</button>
      {msg && <span className="text-sm text-charcoal-500 ml-2">{msg}</span>}
    </form>
  );
}

export function Preferences({ currency, distanceUnit, fuelUnit }: { userId: string; currency: string; distanceUnit: string; fuelUnit: string }) {
  const router = useRouter();
  const [c, setC] = useState(currency);
  const [d, setD] = useState(distanceUnit);
  const [f, setF] = useState(fuelUnit);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: c, distanceUnit: d, fuelUnit: f }) });
    setBusy(false);
    router.refresh();
  };
  return (
    <form onSubmit={save} className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label">Currency</label>
          <select className="select" value={c} onChange={(e) => setC(e.target.value)}>
            <option>USD</option><option>EUR</option><option>MAD</option><option>GBP</option><option>CAD</option>
          </select>
        </div>
        <div><label className="label">Distance</label>
          <select className="select" value={d} onChange={(e) => setD(e.target.value)}>
            <option value="km">km</option><option value="mi">miles</option>
          </select>
        </div>
        <div><label className="label">Fuel unit</label>
          <select className="select" value={f} onChange={(e) => setF(e.target.value)}>
            <option value="L_PER_100KM">L/100km</option><option value="MPG">MPG</option><option value="KM_PER_L">km/L</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "..." : "Save preferences"}</button>
    </form>
  );
}

export function ChangePassword() {
  const [current, setC] = useState("");
  const [next, setN] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const r = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
    if (r.ok) { setMsg("Password updated"); setC(""); setN(""); }
    else setErr("Failed");
  };
  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <input className="input" type="password" required placeholder="Current password" value={current} onChange={(e) => setC(e.target.value)} />
      <input className="input" type="password" required minLength={8} placeholder="New password" value={next} onChange={(e) => setN(e.target.value)} />
      {err && <p className="text-sm text-rose-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <button className="btn btn-primary" type="submit">Change password</button>
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setC] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== "DELETE") return;
    await fetch("/api/auth/account", { method: "DELETE" });
    router.push("/");
  };
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label className="label">Type DELETE to confirm</label>
      <input className="input" value={confirm} onChange={(e) => setC(e.target.value)} />
      <button disabled={confirm !== "DELETE"} className="btn btn-danger" type="submit">Permanently delete</button>
    </form>
  );
}

export const SettingsForms = { Profile, Preferences, ChangePassword, DeleteAccount };
