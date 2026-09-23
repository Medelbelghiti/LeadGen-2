"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ name, email, locale, emailVerified }: { name: string; email: string; locale: string; emailVerified: boolean }) {
  const [n, setN] = useState(name);
  const [l, setL] = useState(locale);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    document.cookie = `lg_locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, locale: l }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved" : "Save failed");
  };

  return (
    <form onSubmit={save} className="space-y-3 mt-3">
      <div>
        <label className="label">Name</label>
        <input className="input" value={n} onChange={(e) => setN(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" value={email} disabled />
        {emailVerified ? (
          <span className="badge badge-ok mt-1">Verified</span>
        ) : (
          <span className="badge badge-warn mt-1">Unverified</span>
        )}
      </div>
      <div>
        <label className="label">Locale</label>
        <select className="select" value={l} onChange={(e) => setL(e.target.value)}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
      </div>
      <button className="btn btn-primary" disabled={saving} type="submit">{saving ? "…" : "Save"}</button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </form>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setC] = useState("");
  const [newPassword, setN] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setMsg("Password updated");
      setC("");
      setN("");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed");
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 mt-3">
      <div>
        <label className="label">Current password</label>
        <input className="input" type="password" required value={currentPassword} onChange={(e) => setC(e.target.value)} />
      </div>
      <div>
        <label className="label">New password (min 8 chars)</label>
        <input className="input" type="password" required minLength={8} value={newPassword} onChange={(e) => setN(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="btn btn-primary" type="submit">Change password</button>
    </form>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirm, setC] = useState("");
  const [busy, setB] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== "DELETE") return;
    setB(true);
    await fetch("/api/auth/account", { method: "DELETE" });
    router.push("/");
  };
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label className="label">Type DELETE to confirm</label>
      <input className="input" value={confirm} onChange={(e) => setC(e.target.value)} />
      <button disabled={busy || confirm !== "DELETE"} className="btn btn-danger" type="submit">Permanently delete</button>
    </form>
  );
}
