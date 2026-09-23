"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((r) => setStatus(r.ok ? "ok" : "err"));
  }, [token]);

  return (
    <main className="container-app py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Email verification</h1>
      <div className="card mt-6 text-sm">
        {status === "loading" && "Verifying…"}
        {status === "ok" && (
          <p>
            ✓ Your email has been verified. <Link className="underline" href="/dashboard">Go to dashboard</Link>.
          </p>
        )}
        {status === "err" && (
          <p className="text-red-600">
            The verification link is invalid or expired. Please request a new one from <Link className="underline" href="/settings">Settings</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
