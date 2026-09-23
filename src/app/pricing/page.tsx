import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";

export default async function PricingPage() {
  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <MarketingShell>
      <section className="container-app py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-center">Plans & pricing</h1>
        <p className="text-center mt-3 text-slate-600 max-w-2xl mx-auto">
          All plans are configurable by the administrator. Pick a plan to get started — upgrade, downgrade, or
          cancel anytime.
        </p>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col">
              <p className="font-bold text-xl">{p.name}</p>
              <p className="text-sm text-slate-600 mt-1">{p.description}</p>
              <p className="mt-4 text-3xl font-extrabold">
                {formatMoney(p.priceCents, p.currency)}
                {p.billingPeriod === "MONTHLY" && (
                  <span className="text-sm font-medium text-slate-500"> /mo</span>
                )}
                {p.billingPeriod === "YEARLY" && (
                  <span className="text-sm font-medium text-slate-500"> /yr</span>
                )}
                {p.billingPeriod === "LIFETIME" && (
                  <span className="text-sm font-medium text-slate-500"> one-time</span>
                )}
              </p>
              <ul className="mt-4 text-sm space-y-1 flex-1">
                <li><strong>{p.monthlyLeadLimit.toLocaleString()}</strong> leads / month</li>
                <li><strong>{p.monthlySearchLimit.toLocaleString()}</strong> searches / month</li>
                <li>Up to <strong>{p.maxResultsPerSearch.toLocaleString()}</strong> results per search</li>
                <li>{p.exportLimit.toLocaleString()} export rows / month</li>
                <li>{p.teamMembersLimit} team member{p.teamMembersLimit > 1 ? "s" : ""}</li>
                <li>API access: {p.apiAccess ? `Yes (${p.apiMonthlyQuota.toLocaleString()}/mo)` : "No"}</li>
                <li>Providers: {safeParseArr(p.providers).join(", ") || "—"}</li>
              </ul>
              <Link href={`/signup?plan=${p.key}`} className="btn btn-primary mt-6">
                Choose {p.name}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-10 max-w-2xl mx-auto">
          Coverage, monthly lead counts, and quotas shown are example defaults. The administrator can change
          all limits from <Link className="underline" href="/admin/plans">/admin/plans</Link>.
          {""} Lifetime is a one-time payment — no recurring charges — and is subject to fair-use limits.
        </p>
      </section>
    </MarketingShell>
  );
}

function safeParseArr(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
