"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setDone(true);
  };

  return (
    <main className="container-app py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      {done ? (
        <p className="card mt-6 text-sm">
          If an account exists for that email, we've sent a reset link. Check your inbox.
        </p>
      ) : (
        <form onSubmit={submit} className="card mt-6 space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" type="submit">Send reset link</button>
        </form>
      )}
      <p className="text-sm mt-4 text-center">
        <Link href="/login" className="underline">Back to log in</Link>
      </p>
    </main>
  );
}
