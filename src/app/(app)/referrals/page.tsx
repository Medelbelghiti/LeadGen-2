import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateReferralCode, buildReferralUrl } from "@/lib/referrals";
import { env } from "@/lib/env";
import { getReferralSettings } from "@/lib/settings";

export default async function ReferralsPage() {
  const user = await requireUser();
  const code = await getOrCreateReferralCode(user.id);
  const url = buildReferralUrl(env.appUrl, code);
  const events = await db.referral.findMany({
    where: { referrerId: user.id },
    include: { referredUser: { select: { email: true, name: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  const settings = await getReferralSettings();

  const rewardText =
    settings.referral_reward_type === "LEADS_BONUS" ? `+${settings.referral_reward_value} leads` :
    settings.referral_reward_type === "COMMISSION_PERCENT" ? `${settings.referral_commission_percent}% commission` :
    `1 month of ${settings.referral_reward_plan_key}`;

  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Referrals</h1>
      <p className="text-sm text-slate-600">Invite other businesses. You earn rewards when they convert.</p>

      <div className="card mt-4">
        <p className="label">Your referral code</p>
        <p className="font-mono text-2xl mt-1">{code}</p>
        <p className="label mt-3">Your referral URL</p>
        <p className="font-mono text-sm mt-1 break-all">{url}</p>
        <p className="text-xs text-slate-500 mt-3">
          Reward for each conversion: <strong>{rewardText}</strong>
        </p>
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Your referrals</p>
        {events.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No referrals yet.</p>
        ) : (
          <table className="basic mt-3">
            <thead><tr><th>Email</th><th>Status</th><th>Revenue</th><th>Commission</th><th>Reward granted</th><th>Joined</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.referredUser.email}</td>
                  <td><span className="badge badge-info">{e.status}</span></td>
                  <td>${(e.revenueCents / 100).toFixed(2)}</td>
                  <td>${(e.commissionCents / 100).toFixed(2)}</td>
                  <td>{e.rewardGranted ? "✓" : "—"}</td>
                  <td>{e.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
