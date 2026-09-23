import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChangePasswordForm, DeleteAccountForm, ProfileForm } from "./Forms";

export default async function SettingsPage() {
  const user = await requireUser();
  const apiKeys = await db.apiKey.count({ where: { userId: user.id, revokedAt: null } });

  return (
    <div className="container-app max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card mt-4">
        <p className="font-semibold">Profile</p>
        <ProfileForm name={user.name ?? ""} email={user.email} locale={user.locale} emailVerified={!!user.emailVerifiedAt} />
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Security</p>
        <ChangePasswordForm />
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Billing</p>
        <p className="text-sm text-slate-600">Manage your plan, payment method, and invoices.</p>
        <Link href="/settings/billing" className="btn btn-primary mt-3">Open billing</Link>
      </div>

      <div className="card mt-4">
        <p className="font-semibold">API access</p>
        <p className="text-sm text-slate-600">{apiKeys} active key{apiKeys === 1 ? "" : "s"}.</p>
        <Link href="/settings/api" className="btn btn-secondary mt-3">Manage API keys</Link>
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Referrals</p>
        <p className="text-sm text-slate-600">Share your referral link and earn rewards.</p>
        <Link href="/referrals" className="btn btn-secondary mt-3">Referral dashboard</Link>
      </div>

      <div className="card mt-4 border-red-200">
        <p className="font-semibold text-red-700">Danger zone</p>
        <p className="text-sm text-slate-600">Permanently delete your account and all related data.</p>
        <DeleteAccountForm />
      </div>
    </div>
  );
}
