import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { BillingClient } from "./BillingClient";
import { stripeConfigured } from "@/lib/env";
import { formatMoney } from "@/lib/utils";

export default async function BillingPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const sub = await db.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const invoices = await db.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const billingEnabled = stripeConfigured();

  return (
    <div className="container-app max-w-4xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      {!billingEnabled && (
        <div className="card mt-4 border-yellow-300 bg-yellow-50 text-sm">
          Stripe billing is not configured on this server. Set <code>STRIPE_SECRET_KEY</code>,
          <code> STRIPE_WEBHOOK_SECRET</code>, and <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to enable
          paid plans and the customer portal.
        </div>
      )}

      <div className="card mt-4">
        <p className="font-semibold">Current plan</p>
        <p className="text-3xl font-extrabold mt-1">{ent.planName}</p>
        <p className="text-sm text-slate-600">Status: {ent.subscriptionStatus ?? "free"}</p>
        {ent.currentPeriodEnd && <p className="text-sm text-slate-600">Renews on {ent.currentPeriodEnd.toISOString().slice(0, 10)}</p>}
        {ent.trialEndsAt && <p className="text-sm text-slate-600">Trial ends {ent.trialEndsAt.toISOString().slice(0, 10)}</p>}
        <BillingClient hasSubscription={Boolean(sub && !ent.isLifetime)} subCancelAtEnd={sub?.cancelAtPeriodEnd ?? false} isLifetime={ent.isLifetime} />
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Available plans</p>
        <div className="grid md:grid-cols-2 gap-2 mt-3">
          {plans.map((p) => (
            <div key={p.id} className="border rounded-md p-3 text-sm">
              <p className="font-semibold">{p.name}</p>
              <p className="text-slate-600">{formatMoney(p.priceCents, p.currency)}{p.billingPeriod === "MONTHLY" ? "/mo" : p.billingPeriod === "YEARLY" ? "/yr" : " one-time"}</p>
              <BillingClient isPlanPicker planId={p.id} planName={p.name} disabled={p.key === ent.planKey} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Invoices</p>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No invoices yet.</p>
        ) : (
          <table className="basic mt-2">
            <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.number ?? i.stripeInvoiceId.slice(0, 12)}</td>
                  <td>{i.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{formatMoney(i.amountCents, i.currency)}</td>
                  <td><span className={`badge ${i.status === "paid" ? "badge-ok" : "badge-warn"}`}>{i.status}</span></td>
                  <td>{i.pdfUrl && <a className="underline text-xs" href={i.pdfUrl} target="_blank" rel="noopener">download</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
