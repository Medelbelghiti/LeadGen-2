import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={{ id: user.id, email: user.email, name: user.name, role: user.role }}>
      {children}
    </AppShell>
  );
}
