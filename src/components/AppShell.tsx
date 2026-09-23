"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem { href: string; label: string; admin?: boolean; }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/search", label: "Search Leads" },
  { href: "/leads", label: "My Leads" },
  { href: "/history", label: "History" },
  { href: "/exports", label: "Exports" },
  { href: "/usage", label: "Usage" },
  { href: "/referrals", label: "Referrals" },
  { href: "/settings", label: "Settings" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/admin", label: "Admin", admin: true },
];

export function AppShell({ user, children }: { user: { id: string; email: string; name: string | null; role: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.admin || user.role === "ADMIN");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 border-r bg-white md:min-h-screen flex-shrink-0">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-md bg-brand-600" />
            <span className="font-bold">LeadGen 2.0</span>
          </Link>
        </div>
        <nav className="flex flex-col p-2 gap-1 text-sm">
          {items.map((n) => {
            const active = path === n.href || path?.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2 rounded-md ${active ? "bg-brand-50 text-brand-800 font-semibold" : "hover:bg-slate-50"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t text-xs text-slate-600">
          <p className="truncate">{user.email}</p>
          <p className="text-slate-500 capitalize">{user.role.toLowerCase()}</p>
          <button onClick={logout} className="mt-2 text-red-600 underline">Log out</button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  );
}
