import { redirect } from "next/navigation";
import { Car, Home, Fuel, Receipt, BarChart3 } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: { id: string; email: string; name: string | null; role: string }; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="flex-1 bg-charcoal-50 dark:bg-charcoal-950 pb-20 md:pb-0">{children}</main>
      <MobileNav />
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
    { href: "/financial-twin", label: "Financial Twin", icon: BarChart3 },
    { href: "/scenarios", label: "Scenarios", icon: BarChart3 },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/receipts", label: "Receipts", icon: Receipt },
    { href: "/settings", label: "Settings", icon: BarChart3 },
  ];
  return (
    <aside className="hidden md:flex md:w-60 border-r border-charcoal-200 bg-white dark:bg-charcoal-900 dark:border-charcoal-800 md:min-h-screen flex-shrink-0 flex-col">
      <div className="p-4 border-b border-charcoal-200 dark:border-charcoal-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-charcoal-900 text-white dark:bg-white dark:text-charcoal-900">
            <Car className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold">AutoEco</span>
        </Link>
      </div>
      <nav className="flex flex-col p-2 gap-1 text-sm flex-1">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-charcoal-50 dark:hover:bg-charcoal-800">
            <n.icon className="w-4 h-4 text-charcoal-500" />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-charcoal-200 dark:border-charcoal-800 text-xs text-charcoal-500">
        <p className="truncate">{user.email}</p>
        <p className="capitalize">{user.role.toLowerCase()}</p>
        <form action="/api/auth/logout" method="post" className="mt-2">
          <button className="text-rose-600 underline">Log out</button>
        </form>
      </div>
    </aside>
  );
}

function MobileNav() {
  const items = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/garage", label: "Garage", icon: Car },
    { href: "/expenses/new", label: "Add", icon: Receipt, primary: true },
    { href: "/insights", label: "Insights", icon: BarChart3 },
    { href: "/settings", label: "Profile", icon: BarChart3 },
  ];
  void items;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-charcoal-900 border-t border-charcoal-200 dark:border-charcoal-800 flex justify-around items-center h-16 px-1">
      {items.map((n) => (
        <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] ${n.primary ? "text-emerald-700" : "text-charcoal-600 dark:text-charcoal-300"}`}>
          <span className={`inline-flex items-center justify-center ${n.primary ? "w-10 h-10 -mt-4 rounded-full bg-emerald-600 text-white shadow-lg" : ""}`}>
            <n.icon className="w-5 h-5" />
          </span>
          {!n.primary && <span>{n.label}</span>}
        </Link>
      ))}
    </nav>
  );
}

void redirect;
void getCurrentUser;
