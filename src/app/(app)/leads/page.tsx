import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

interface SP { searchParams: { [k: string]: string | undefined } }

export default async function LeadsPage({ searchParams }: SP) {
  const user = await requireUser();
  const page = Number(searchParams.page ?? 1);
  const pageSize = 50;
  const where: Record<string, unknown> = { userId: user.id };
  if (searchParams.search) where.searchId = searchParams.search;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { businessName: { contains: searchParams.q } },
      { city: { contains: searchParams.q } },
      { phone: { contains: searchParams.q } },
    ];
  }

  const [total, items] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { dataQualityScore: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return (
    <div className="container-app">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">My leads</h1>
        <div className="flex gap-2 flex-wrap">
          <form method="get" className="flex gap-2">
            <input className="input" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search…" />
            <select className="select" name="status" defaultValue={searchParams.status ?? ""}>
              <option value="">All status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className="btn btn-secondary" type="submit">Filter</button>
          </form>
          <Link className="btn btn-primary" href="/exports">Export</Link>
        </div>
      </div>

      <p className="text-sm text-slate-600 mt-1">{total.toLocaleString()} leads stored.</p>

      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead>
            <tr>
              <th>Business</th><th>Phone</th><th>Email</th><th>Website</th><th>City</th><th>Country</th>
              <th>Quality</th><th>Status</th><th>Source</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{l.businessName}</td>
                <td className="font-mono text-xs">{l.internationalPhone ?? "—"}</td>
                <td>{l.email ?? "—"}</td>
                <td className="text-xs"><a href={l.website ?? "#"} target="_blank" rel="noopener">{l.domain ?? "—"}</a></td>
                <td>{l.city ?? "—"}</td>
                <td>{l.country ?? "—"}</td>
                <td><span className="badge badge-info">{l.dataQualityScore}</span></td>
                <td><span className={`badge ${l.status === "CONVERTED" ? "badge-ok" : l.status === "REJECTED" ? "badge-err" : "badge-info"}`}>{l.status}</span></td>
                <td><span className="badge badge-info">{l.source}</span></td>
                <td><Link className="text-xs underline" href={`/leads/${l.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm mt-3">
        <span>Page {page}</span>
        <div className="flex gap-2">
          {page > 1 && <Link className="underline" href={{ query: { ...searchParams, page: page - 1 } }}>← Previous</Link>}
          {(page * pageSize) < total && <Link className="underline" href={{ query: { ...searchParams, page: page + 1 } }}>Next →</Link>}
        </div>
      </div>
    </div>
  );
}
