import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { formatMoney } from "@/lib/finance";
import { stripeConfigured } from "@/lib/env";
import { BillingClient } from "./Client";

export default async function BillingPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const sub = await db.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const invoices = await db.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const billingEnabled = stripeConfigured();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-charcoal-500 underline">← Back to settings</Link>
        <h1 className="text-2xl font-bold mt-2">Billing</h1>
      </div>

      {!billingEnabled && (
        <div className="card border-amber-300 bg-amber-50 text-sm">
          <p className="font-semibold text-amber-800">Stripe billing is not configured on this server.</p>
          <p className="mt-1 text-amber-700">Set <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code> and the Price IDs (<code>STRIPE_PRICE_PRO</code>, <code>STRIPE_PRICE_FAMILY</code>, <code>STRIPE_PRICE_PRO_PLUS</code>) in your environment to enable paid plans.</p>
        </div>
      )}

      <div className="card">
        <p className="font-semibold">Current plan</p>
        <p className="text-3xl font-extrabold mt-1">{ent.planName}</p>
        <p className="text-sm text-charcoal-500">Status: <strong>{ent.subscriptionStatus ?? "free"}</strong></p>
        {ent.currentPeriodEnd && !ent.isLifetime && <p className="text-sm text-charcoal-500">Renews: {ent.currentPeriodEnd.toISOString().slice(0, 10)}</p>}
        {ent.isTrial && ent.trialEndsAt && <p className="text-sm text-amber-700">Trial ends {ent.trialEndsAt.toISOString().slice(0, 10)}</p>}
        <BillingClient
          hasSubscription={Boolean(sub && sub.status !== "lifetime" && sub.stripeSubscriptionId)}
          subCancelAtEnd={sub?.cancelAtPeriodEnd ?? false}
          isLifetime={ent.isLifetime}
          hasStripeCustomer={Boolean(user.stripeCustomerId)}
          billingEnabled={billingEnabled}
        />
      </div>

      <div className="card">
        <p className="font-semibold">Available plans</p>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {plans.map((p) => (
            <div key={p.id} className="border border-charcoal-200 dark:border-charcoal-700 rounded-md p-3 text-sm">
              <p className="font-bold">{p.name}</p>
              <p className="text-charcoal-500">{formatMoney(p.priceCents, p.currency)}{p.billingPeriod === "MONTHLY" ? "/mo" : p.billingPeriod === "YEARLY" ? "/yr" : ""}</p>
              <p className="text-xs text-charcoal-500 mt-1">{p.maxVehicles} vehicles · {p.maxExpensesPerMonth} expenses/mo · {p.aiConversationsPerMonth} AI chats/mo</p>
              <BillingClient isPlanPicker planId={p.id} planName={p.name} disabled={p.key === ent.planKey} billingEnabled={billingEnabled} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="font-semibold">Invoices</p>
        {invoices.length === 0 ? (
          <p className="text-sm text-charcoal-500 mt-2">No invoices yet.</p>
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
