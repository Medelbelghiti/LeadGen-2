import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { ApiKeysClient } from "./ApiKeysClient";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const items = await db.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-app max-w-3xl">
      <h1 className="text-2xl font-bold">API keys</h1>
      <p className="text-sm text-slate-600">
        Use API keys to access LeadGen 2.0 programmatically. Keys are hashed at rest and can be revoked at any time.
      </p>

      {!ent.apiAccess && (
        <div className="card mt-4 border-yellow-300 bg-yellow-50 text-sm">
          API access is not enabled on your current plan. Upgrade to a Pro, Business, or Lifetime plan to enable it.
        </div>
      )}

      {ent.apiAccess && (
        <div className="card mt-4">
          <p className="font-semibold">Create new key</p>
          <ApiKeysClient />
        </div>
      )}

      <div className="card mt-4">
        <p className="font-semibold">Existing keys</p>
        {items.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No keys yet.</p>
        ) : (
          <table className="basic mt-3">
            <thead><tr><th>Name</th><th>Prefix</th><th>Last used</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {items.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="font-mono text-xs">{k.prefix}…</td>
                  <td>{k.lastUsedAt ? k.lastUsedAt.toISOString().slice(0, 16).replace("T", " ") : "—"}</td>
                  <td>{k.revokedAt ? <span className="badge badge-err">revoked</span> : <span className="badge badge-ok">active</span>}</td>
                  <td>{k.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{!k.revokedAt && <RevokeButton id={k.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RevokeButton({ id }: { id: string }) {
  return (
    <form action={`/api/apikeys/${id}`} method="post">
      <input type="hidden" name="_method" value="DELETE" />
      <button type="submit" className="text-xs text-red-700 underline">Revoke</button>
    </form>
  );
}
