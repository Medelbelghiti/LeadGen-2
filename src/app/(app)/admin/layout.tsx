import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }
  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Administration</h1>
      <nav className="flex gap-2 flex-wrap text-sm mt-2 mb-6">
        <Link href="/admin" className="underline">Overview</Link>
        <Link href="/admin/plans" className="underline">Plans</Link>
        <Link href="/admin/coupons" className="underline">Coupons</Link>
        <Link href="/admin/affiliates" className="underline">Affiliates</Link>
        <Link href="/admin/providers" className="underline">Providers</Link>
        <Link href="/admin/users" className="underline">Users</Link>
        <Link href="/admin/settings" className="underline">Settings</Link>
        <Link href="/admin/feature-flags" className="underline">Feature flags</Link>
      </nav>
      {children}
    </div>
  );
}
