import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const lead = await db.lead.findUnique({ where: { id: params.id } });
  if (!lead) notFound();
  assertOwnership(lead.userId, user);

  return (
    <div className="container-app max-w-3xl">
      <Link href="/leads" className="text-sm underline">← Back to leads</Link>
      <h1 className="text-2xl font-bold mt-2">{lead.businessName}</h1>
      <p className="text-sm text-slate-600">{lead.category} · {lead.country ?? ""}</p>

      <div className="card mt-4 grid md:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="label">Phone</p>
          <p>{lead.internationalPhone ?? "—"} {lead.phoneVerified && <span className="badge badge-ok ml-1">verified</span>}</p>
        </div>
        <div>
          <p className="label">Email</p>
          <p>{lead.email ?? "—"}{lead.emailVerified && <span className="badge badge-ok ml-1">verified</span>}</p>
        </div>
        <div>
          <p className="label">Website</p>
          <p>{lead.website ? <a href={lead.website} className="underline" target="_blank" rel="noopener">{lead.domain}</a> : "—"}</p>
        </div>
        <div>
          <p className="label">Address</p>
          <p>{lead.address ?? "—"}</p>
        </div>
        <div>
          <p className="label">City / Region</p>
          <p>{lead.city ?? "—"} / {lead.region ?? "—"}</p>
        </div>
        <div>
          <p className="label">Coordinates</p>
          <p>{lead.latitude?.toFixed(4) ?? "—"}, {lead.longitude?.toFixed(4) ?? "—"}</p>
        </div>
        <div>
          <p className="label">Source</p>
          <p>{lead.source} · <a href={lead.sourceUrl ?? "#"} className="underline" target="_blank" rel="noopener">view</a></p>
        </div>
        <div>
          <p className="label">Data quality</p>
          <p><span className="badge badge-info">{lead.dataQualityScore}/100</span></p>
        </div>
      </div>

      <div className="card mt-4">
        <p className="label">CRM</p>
        <p>Status: <span className="badge badge-info">{lead.status}</span></p>
        <p className="mt-2">Tags: {safeParse(lead.tags).join(", ") || "—"}</p>
        <p className="mt-2">Notes:</p>
        <pre className="text-xs whitespace-pre-wrap bg-slate-50 p-2 mt-1 rounded">{lead.notes ?? ""}</pre>
        <p className="mt-2 text-xs text-slate-500">Collected {lead.collectedAt.toISOString().slice(0, 19).replace("T", " ")}</p>
      </div>
    </div>
  );
}

function safeParse(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
