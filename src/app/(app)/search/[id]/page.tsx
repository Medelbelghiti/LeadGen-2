import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { safeJsonParse } from "@/lib/utils";

interface ProviderStat { requested: number; results: number; status: string; error?: string; }

export default async function SearchDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const search = await db.search.findUnique({ where: { id: params.id }, include: { leads: { take: 200, orderBy: { dataQualityScore: "desc" } } } });
  if (!search) notFound();
  assertOwnership(search.userId, user);
  const stats = safeJsonParse<Record<string, ProviderStat>>(search.providerStats, {});

  return (
    <div className="container-app">
      <Link href="/history" className="text-sm underline">← Back to history</Link>
      <h1 className="text-2xl font-bold mt-2">{search.niche} in {search.location}</h1>
      <p className="text-sm text-slate-600">
        Status: <span className={`badge ${badgeClass(search.status)}`}>{search.status}</span>
        {search.isDemo && <span className="badge badge-warn ml-2">DEMO DATA</span>}
      </p>

      <div className="card mt-4">
        <p className="font-semibold">Progress</p>
        <div className="progress mt-2"><span style={{ width: `${search.progress}%` }} /></div>
        <p className="text-xs text-slate-600 mt-1">{search.progressMessage ?? ""}</p>

        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
          {Object.entries(stats).map(([k, s]) => (
            <div key={k} className="border rounded-md p-3">
              <p className="font-semibold capitalize">{k}</p>
              <p>Status: <span className={`badge ${s.status === "OK" ? "badge-ok" : s.status === "FAILED" ? "badge-err" : "badge-info"}`}>{s.status}</span></p>
              <p>Results: {s.results}</p>
              {s.error && <p className="text-xs text-red-600">{s.error}</p>}
            </div>
          ))}
        </div>

        {search.status === "RUNNING" && (
          <form action={`/api/search/${search.id}/cancel`} method="post" className="mt-4">
            <button className="btn btn-danger" type="submit">Cancel search</button>
          </form>
        )}
      </div>

      <div className="card mt-6">
        <div className="flex justify-between items-center">
          <p className="font-semibold">Results ({search.resultsCount})</p>
          <Link className="btn btn-secondary text-sm" href={`/leads?search=${search.id}`}>View all</Link>
        </div>
        {search.leads.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No leads yet.</p>
        ) : (
          <table className="basic mt-3">
            <thead>
              <tr>
                <th>Business</th><th>Phone</th><th>City</th><th>Country</th><th>Quality</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {search.leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.businessName}</td>
                  <td>{l.internationalPhone ?? "—"}</td>
                  <td>{l.city ?? "—"}</td>
                  <td>{l.country ?? "—"}</td>
                  <td>{l.dataQualityScore}</td>
                  <td><span className="badge badge-info">{l.source}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function badgeClass(s: string) {
  if (s === "COMPLETED") return "badge-ok";
  if (s === "FAILED") return "badge-err";
  if (s === "CANCELED") return "badge-warn";
  return "badge-info";
}
