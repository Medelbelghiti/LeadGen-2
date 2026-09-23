import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function HistoryPage() {
  const user = await requireUser();
  const searches = await db.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Search history</h1>
      <p className="text-sm text-slate-600 mt-1">{searches.length} searches.</p>
      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead>
            <tr>
              <th>Niche</th><th>Location</th><th>Status</th><th>Results</th>
              <th>Duplicates</th><th>Duration</th><th>Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id}>
                <td>{s.niche}</td>
                <td>{s.location}</td>
                <td><span className={`badge ${s.status === "COMPLETED" ? "badge-ok" : s.status === "FAILED" ? "badge-err" : "badge-info"}`}>{s.status}</span></td>
                <td>{s.resultsCount}</td>
                <td>{s.duplicatesRemoved}</td>
                <td>{s.durationMs ? `${(s.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                <td>{s.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td><Link className="text-xs underline" href={`/search/${s.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
