import { MarketingShell } from "@/components/MarketingShell";

export default function DocsPage() {
  return (
    <MarketingShell>
      <article className="container-app py-12 prose max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-sm text-slate-600 mt-2">
          Read the project README for the full installation, configuration, deployment, and provider setup
          guide.
        </p>

        <h2 className="text-xl font-semibold mt-8">Quick start</h2>
        <ol className="list-decimal pl-6 space-y-1 mt-2 text-sm">
          <li>Clone the repository and run <code>npm install</code>.</li>
          <li>Copy <code>.env.example</code> to <code>.env</code> and set <code>AUTH_SECRET</code>.</li>
          <li>Run <code>npm run prisma:deploy</code> then <code>npm run prisma:seed</code>.</li>
          <li>Start the app with <code>npm run dev</code>.</li>
          <li>For billing, set <code>STRIPE_MODE</code>, <code>STRIPE_SECRET_KEY</code>, and <code>STRIPE_WEBHOOK_SECRET</code>.</li>
          <li>For Google Places coverage, set <code>GOOGLE_PLACES_API_KEY</code>.</li>
        </ol>

        <h2 className="text-xl font-semibold mt-8">Customer API</h2>
        <p className="text-sm text-slate-600 mt-2">
          Generate a key from <em>Settings → API</em>. Authenticate with{" "}
          <code>Authorization: Bearer lgk_…</code>. Endpoints: <code>POST /api/v1/search</code>,{" "}
          <code>GET /api/v1/search/:id</code>, <code>GET /api/v1/leads</code>.
        </p>

        <h2 className="text-xl font-semibold mt-8">Provider coverage notes</h2>
        <p className="text-sm text-slate-600 mt-2">
          LeadGen 2.0 ships with the Demo, OpenStreetMap, and Google Places providers. Real coverage depends
          entirely on each provider's data and quotas. Demo provider returns clearly-labeled synthetic data
          for testing — it is never mixed with real records.
        </p>
      </article>
    </MarketingShell>
  );
}
