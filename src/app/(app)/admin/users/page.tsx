import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    where: { deletedAt: null },
    include: { plan: true, subscriptions: true, _count: { select: { leads: true, searches: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h2 className="text-xl font-bold">Users</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Plan</th><th>Leads</th><th>Searches</th><th>Trial</th><th>Bonus</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === "ADMIN" ? "badge-warn" : "badge-info"}`}>{u.role}</span></td>
                <td>{u.plan?.name ?? "—"}</td>
                <td>{u._count.leads}</td>
                <td>{u._count.searches}</td>
                <td>{u.trialEndsAt ? u.trialEndsAt.toISOString().slice(0, 10) : "—"}</td>
                <td>{u.bonusLeads}</td>
                <td>{u.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-2">Showing the latest 100 users.</p>
      <p className="text-xs text-slate-500">{formatMoney(0)} placeholder</p>
    </div>
  );
}
