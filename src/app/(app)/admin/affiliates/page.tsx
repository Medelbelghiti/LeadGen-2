"use client";
import { useEffect, useState } from "react";

type Affiliate = {
  id: string; userId: string; code: string; status: string;
  clicks: number; signups: number; trials: number; paidUsers: number;
  revenueCents: number; commissionCents: number; pendingCents: number; paidCents: number;
  user: { email: string; name: string | null };
};

export default function AdminAffiliatesPage() {
  const [items, setItems] = useState<Affiliate[]>([]);
  const refresh = async () => {
    const r = await fetch("/api/admin/affiliates");
    if (r.ok) setItems((await r.json()).items);
  };
  useEffect(() => { void refresh(); }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Affiliates</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead><tr><th>User</th><th>Code</th><th>Status</th><th>Clicks</th><th>Signups</th><th>Trials</th><th>Paid</th><th>Revenue</th><th>Pending</th><th>Paid out</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.user.email}</td>
                <td className="font-mono">{a.code}</td>
                <td>{a.status}</td>
                <td>{a.clicks}</td>
                <td>{a.signups}</td>
                <td>{a.trials}</td>
                <td>{a.paidUsers}</td>
                <td>${(a.revenueCents / 100).toFixed(2)}</td>
                <td>${(a.pendingCents / 100).toFixed(2)}</td>
                <td>${(a.paidCents / 100).toFixed(2)}</td>
                <td className="space-x-1">
                  {a.status !== "APPROVED" && <button onClick={() => patch(a.id, { status: "APPROVED" })} className="text-xs underline text-green-700">approve</button>}
                  {a.status === "APPROVED" && <button onClick={() => patch(a.id, { status: "SUSPENDED" })} className="text-xs underline text-yellow-700">suspend</button>}
                  {a.status !== "REJECTED" && <button onClick={() => patch(a.id, { status: "REJECTED" })} className="text-xs underline text-red-700">reject</button>}
                  {a.pendingCents > 0 && (
                    <button onClick={() => { const v = prompt("Pay out cents:", String(a.pendingCents)); if (v) patch(a.id, { markPaidCents: Number(v) }); }} className="text-xs underline text-brand-700">mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
