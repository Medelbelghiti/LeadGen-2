"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <main className="container-app py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "…" : "Log in"}
        </button>
      </form>
      <p className="text-sm mt-4 text-center">
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
      <p className="text-sm mt-2 text-center">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </main>
  );
}
