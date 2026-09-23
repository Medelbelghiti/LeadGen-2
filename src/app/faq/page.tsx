import { MarketingShell } from "@/components/MarketingShell";
import fs from "node:fs/promises";
import path from "node:path";

export default async function FaqPage() {
  const md = await readFileSafe("C:/Users/pc/AppData/Local/Temp/opencode/leadgen-content/faq.md");
  return (
    <MarketingShell>
      <article className="container-app py-12 prose max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Frequently asked questions</h1>
        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-md border mt-4">{md}</pre>
      </article>
    </MarketingShell>
  );
}

async function readFileSafe(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return "FAQ content not yet available. Please see the README for documentation.";
  }
  void path;
}
