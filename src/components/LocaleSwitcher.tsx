"use client";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n";

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const onChange = async (v: string) => {
    document.cookie = `lg_locale=${v}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Update user locale if logged in
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: v }),
      });
    } catch {
      /* ignore */
    }
    router.refresh();
  };
  return (
    <select
      aria-label="Language"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="select"
      style={{ width: 80 }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {l === "en" ? "EN" : "FR"}
        </option>
      ))}
    </select>
  );
}
