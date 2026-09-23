import { db } from "@/lib/db";
import { currentMonthKey } from "@/lib/utils";

export default async function AdminBilling() {
  const period = currentMonthKey();
  const [mrrAgg, arrAgg, recentInvoices, byMonth] = await Promise.all([
    db.invoice.aggregate({ where: { status: "paid", createdAt: { gte: new Date(`${period}-01`) } }, _sum: { amountCents: true } }),
    db.invoice.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.invoice.groupBy({
      by: ["status"],
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);
  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Billing dashboard</h1>
      <p className="text-sm text-slate-600">Period: {period}</p>

      <div className="grid md:grid-cols-3 gap-3 mt-6">
        <Stat label="MRR (paid this month)" value={`$${((mrrAgg._sum.amountCents ?? 0) / 100).toFixed(2)}`} />
        <Stat label="All-time paid revenue" value={`$${((arrAgg._sum.amountCents ?? 0) / 100).toFixed(2)}`} />
        <Stat label="Invoices tracked" value={recentInvoices.length.toLocaleString()} />
      </div>

      <div className="card mt-6">
        <p className="font-semibold">By status</p>
        <table className="basic mt-2">
          <thead><tr><th>Status</th><th>Count</th><th>Total cents</th></tr></thead>
          <tbody>
            {byMonth.map((r) => (
              <tr key={r.status}><td>{r.status}</td><td>{r._count}</td><td>{r._sum.amountCents ?? 0}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Recent invoices</p>
        <table className="basic mt-2">
          <thead><tr><th>Invoice</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead>
          <tbody>
            {recentInvoices.map((i) => (
              <tr key={i.id}>
                <td>{i.number ?? i.stripeInvoiceId.slice(0, 10)}</td>
                <td><span className={`badge ${i.status === "paid" ? "badge-ok" : "badge-warn"}`}>{i.status}</span></td>
                <td>${(i.amountCents / 100).toFixed(2)}</td>
                <td>{i.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="label">{label}</p><p className="text-2xl font-extrabold mt-1">{value}</p></div>;
}
