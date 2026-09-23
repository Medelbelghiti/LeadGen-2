import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, dirFor, isLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "LeadGen 2.0 — Global Business Lead Discovery",
    template: "%s | LeadGen 2.0",
  },
  description:
    "Search any business niche in any country. Multi-provider lead discovery, automatic deduplication, CRM, and export.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get("lg_locale")?.value;
  const locale: Locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const dir = dirFor(locale);
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
