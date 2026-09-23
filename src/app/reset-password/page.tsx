"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Reset failed");
      return;
    }
    router.push("/login");
  };

  return (
    <main className="container-app py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">{loading ? "…" : "Reset password"}</button>
      </form>
      <p className="text-sm mt-4 text-center">
        <Link href="/login" className="underline">Back to log in</Link>
      </p>
    </main>
  );
}
