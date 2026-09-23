"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get("ref") ?? params.get("aff") ?? "";
  const demo = params.get("demo") === "1";
  const plan = params.get("plan") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, ref }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Signup failed");
      return;
    }
    const target = plan ? `/pricing?plan=${plan}` : demo ? "/search?demo=1" : "/dashboard";
    router.push(target);
    router.refresh();
  };

  return (
    <main className="container-app py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Create your account</h1>
      {ref && <p className="text-xs text-slate-600 mt-1">Referred by code <code>{ref}</code></p>}
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password (min 8 chars)</label>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "…" : "Create account"}
        </button>
      </form>
      <p className="text-xs text-slate-500 mt-4">
        By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
      <p className="text-sm mt-3 text-center">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}
