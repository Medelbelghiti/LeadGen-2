import { redirect } from "next/navigation";
import { Car, Home, Fuel, Receipt, FileText, Settings, LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: { id: string; email: string; name: string | null; role: string }; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="flex-1 bg-charcoal-50 dark:bg-charcoal-950">{children}</main>
    </div>
  );
}

function Sidebar({ user }: { user: { id: string; email: string; name: string | null; role: string } }) {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/garage", label: "Garage", icon: Car },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/fuel", label: "Fuel", icon: Fuel },
    { href: "/insights", label: "Insights", icon: BarChart3 },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <aside className="md:w-60 border-r border-charcoal-200 bg-white dark:bg-charcoal-900 dark:border-charcoal-800 md:min-h-screen flex-shrink-0">
      <div className="p-4 border-b border-charcoal-200 dark:border-charcoal-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-charcoal-900 text-white dark:bg-white dark:text-charcoal-900">
            <Car className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold">AutoEco</span>
        </Link>
      </div>
      <nav className="flex flex-col p-2 gap-1 text-sm">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
          >
            <n.icon className="w-4 h-4 text-charcoal-500" />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-charcoal-200 dark:border-charcoal-800 text-xs text-charcoal-500 mt-auto">
        <p className="truncate">{user.email}</p>
        <p className="capitalize">{user.role.toLowerCase()}</p>
        <form action="/api/auth/logout" method="post" className="mt-2">
          <button className="text-rose-600 underline flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

void redirect;
void getCurrentUser;
