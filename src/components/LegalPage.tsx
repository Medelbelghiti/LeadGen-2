import { MarketingShell } from "@/components/MarketingShell";
import fs from "node:fs/promises";
import path from "node:path";

export async function LegalPage({ file, title }: { file: string; title: string }) {
  let body = "";
  try {
    body = await fs.readFile(path.join(process.cwd(), "legal", file), "utf8");
  } catch {
    body = "Legal document not available.";
  }
  return (
    <MarketingShell>
      <article className="container-app py-12 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">{title}</h1>
        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-md border mt-6 leading-relaxed">
{body}
        </pre>
      </article>
    </MarketingShell>
  );
}
