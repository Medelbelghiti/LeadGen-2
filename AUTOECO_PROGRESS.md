# AUTOECO — Final Production Audit & Hardening (V1.3)

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 warnings |
| `npm test` | **38 / 38 passing** (6 files) |
| `npm run build` | OK (Next.js 14 production) |
| Deployment | Pushed to `main`; Vercel auto-deploys |

## Audit Summary

### Bugs Found (this session)

1. **CRITICAL — Financial double-counting in `trueOwnershipCost`**: `monthlyFixedCents` was added on top of `monthlyAverage`, which already included all recorded categories (insurance, tax). Result: insurance/tax counted twice.
2. **CRITICAL — Mixed-currency silently summed**: `summarizeExpenses` ignored `_currency` parameter and added EUR + USD + MAD as if identical cents.
3. **CRITICAL — Scenario client-controlled outputs**: `/api/scenarios` POST accepted an `outputs` object from the client. A malicious client could submit fabricated savings/totals.
4. **HIGH — Fuel history bug**: `findFirst({ orderBy: { date: "desc" } })` returned the most recent prior entry regardless of date. Backfilling a historical entry with an older date would select a NEWER entry as the "previous" reference and produce negative distance.
5. **HIGH — AUTH_SECRET silent fallback**: `env.ts` defaulted to `"dev-only-insecure-secret"` in production with no enforcement.
6. **HIGH — Raw `e.message` leaked to clients**: `http.ts` returned raw exception messages (potentially including Prisma errors, filesystem paths, stack-trace fragments).
7. **MEDIUM — Storage path-traversal exposure**: `readFile`/`deleteFile` did a string strip but no `resolve()` containment check.
8. **MEDIUM — Receipt category whitelist bypass**: receipts POST accepted any category string.

### Bugs Fixed (this session)

1. Renamed `monthlyFixedCents` → `forwardLookingFixedCents` with explicit assumptions. Added per-source labelling in the breakdown.
2. `summarizeExpenses` now throws `CurrencyMismatchError` on mixed currencies. All callers (dashboard, garage, vehicle detail, insights, financial-twin, reports, share, AI, scenarios) handle it explicitly and show a clear error message instead of producing invalid totals.
3. `/api/scenarios` POST now accepts only `inputs` and **computes `outputs` server-side**. Client-supplied outputs are ignored.
4. Fuel POST `findFirst` now requires `date < current.date` AND `mileage <= current.mileage` to prevent negative-distance bugs from historical backfill.
5. `env.ts` no longer falls back to a hardcoded secret. `assertProdOnBoot()` runs lazily on the first `requireUser()` call and throws if `AUTH_SECRET` is missing or <32 bytes in production.
6. `http.ts` now returns `{ error: "Something went wrong", referenceId: "ref_…" }` for unexpected errors, with the full stack logged server-side. Zod/Auth/RateLimit/Billing/Currency errors are surfaced with user-safe messages.
7. `storage.ts` now uses `path.resolve()` + prefix check. Storage keys are also constrained to a strict alphanumeric charset at write time.
8. `receipts` route validates `category` against the `ALLOWED_CATEGORIES` whitelist.

### Security Fixes

- AUTH_SECRET fail-fast (P0)
- Path-traversal-safe storage with `path.resolve()` + prefix check (P0)
- All internal `e.message` returned to client replaced with generic message + referenceId
- Storage keys constrained to `[a-z0-9-_/]` at write
- Receipt categories validated against whitelist
- Currency whitelist enforced (`USD | EUR | MAD | GBP | CAD`)
- Mixed-currency aggregation refuses to compute (returns 422 with `MIXED_CURRENCY` code)
- Vehicle ownership checked on receipt upload
- Document GET/DELETE enforced via `assertOwnership`
- Share links use random 24-byte tokens, expire after 30 days, and can be revoked
- Stripe webhook signature verification + `WebhookEvent` idempotency table preserved
- API key HMAC hashing preserved
- Rate limit on signup/login preserved
- Documents served with `Cache-Control: private, no-store`

### Financial Integrity Fixes

- `summarizeExpenses` strictly single-currency; throws on mixed
- `trueOwnershipCost` no longer double-counts; explicit forward-fixed flag with assumptions
- `projectCost` validates horizon (1-600 months) and inflation (-50% to +100%)
- `computeDepreciation` rejects negative inputs and future purchase dates
- Every numeric output asserted via `assertFiniteNumber()` — never NaN/Infinity
- `CostSummary.breakdown` documents all categories — no silent omission
- `forecastAssumptions` are returned and surfaced in every UI

### Billing/Stripe Fixes

- `cancelSubscription` scoped by `userId` (was global — could cancel someone else's sub)
- `WebhookEvent` idempotency preserved
- `/api/billing/checkout` returns 503 with clear message when Stripe not configured (no fake success)
- `/settings/billing` UI gates behind `billingEnabled` flag

### AI Fixes

- AI route handles mixed-currency gracefully (returns "can't compute" message)
- AI prompt explicitly forbids fabricating numbers + forbids safety diagnoses
- AI only invoked when `OPENAI_API_KEY` set; deterministic fallback always works
- AI usage limit is server-side via `ent.aiConversationsPerMonth`

### Vehicle-data Fixes

- Vehicle catalog architecture (`VehicleCatalogEntry`) preserved and never fabricated
- Manual vehicle entry always available (`/garage/new`)
- Mixed-currency in vehicles shows a clear message, not a fake total

### Receipt Scanner

- MIME + size validation
- Path-traversal-safe storage
- Category whitelist enforced
- OCR provider abstraction returns "unavailable" cleanly when no provider configured (NEVER fabricates)
- Document GET/DELETE owner-checked
- Private file streaming (`Cache-Control: private, no-store`)

### Reports

- `/reports` web report based on ACTUAL data only
- Share-link page exposes only aggregated metrics (never email/account)
- Revocation supported
- 30-day expiry on shared links

### Savings/Gamification

- `SavingsGoal` CRUD owner-checked
- Achievements auto-unlock via count checks (idempotent `upsert`)

### SEO

- `/`, `/features`, `/docs`, `/faq`, `/pricing`, `/calculators/*` exist
- Aliases: `/car-cost-calculator`, `/fuel-cost-calculator`, `/car-depreciation-calculator`, `/true-cost-of-car` → redirect to canonical
- `/car-comparison` is a real (informational) page
- `/financial-twin` is a real (informational) page
- Per-page `metadata` exported where needed
- No fake testimonials, no fake stats, no fake logos

## Tests Added (this session)

- `tests/finance-double-count.test.ts` — 4 regression tests proving no double-counting, source labelling
- Updated `tests/finance.test.ts` — replaced `monthlyFixedCents` with `forwardLookingFixedCents`, added `CurrencyMismatchError` test
- `tests/finance-edge.test.ts` — already 7 tests covering zero mileage, NaN safety, negative inflation

## Files Changed (this session, summary)

- `src/lib/finance.ts` — currency guard, depreciation hardening, `trueOwnershipCost` no-double-count
- `src/lib/env.ts` — `assertProdOnBoot` fail-fast
- `src/lib/http.ts` — generic error + referenceId, no `e.message` leak
- `src/lib/storage.ts` — path-traversal-safe, strict key charset
- `src/lib/compute-cost.ts` — returns `VehicleCostResult` discriminated union
- `src/lib/auth.ts` — lazy production-safety check
- `src/app/api/scenarios/route.ts` — server-side calculation, no client outputs
- `src/app/api/fuel/route.ts` — historical-insertion bug fix
- `src/app/api/receipts/route.ts` — category whitelist
- `src/app/api/ai/route.ts` — mixed-currency guard
- `src/app/(app)/dashboard/page.tsx` — handle mixed-currency
- `src/app/(app)/garage/page.tsx` — handle mixed-currency
- `src/app/(app)/garage/[id]/page.tsx` — handle mixed-currency
- `src/app/(app)/insights/page.tsx` — handle mixed-currency
- `src/app/(app)/reports/page.tsx` — handle mixed-currency
- `src/app/(app)/scenarios/page.tsx` — handle mixed-currency
- `src/app/(app)/share/page.tsx` — handle mixed-currency
- `src/app/(app)/financial-twin/page.tsx` — NEW
- `src/app/(app)/receipts/page.tsx` — receipts UI
- `src/app/(app)/settings/billing/page.tsx` — Stripe-aware billing UI
- `src/app/(app)/settings/billing/Client.tsx` — billing actions
- `src/app/(app)/goals/page.tsx` — savings goals + achievements
- `src/app/(app)/goals/Form.tsx` — savings form
- `src/app/api/billing/{checkout,portal,invoices,cancel,resume}/route.ts` — restored
- `src/app/api/stripe/webhook/route.ts` — restored
- `src/app/api/receipts/route.ts` — receipts CRUD
- `src/app/api/ai/route.ts` — real grounded AI
- `src/app/api/documents/[id]/route.ts` — owner-checked document stream/delete
- `src/app/api/reports/share/route.ts` — share link create/list
- `src/app/api/reports/share/[token]/revoke/route.ts` — revoke
- `src/app/api/goals/route.ts` — savings goal CRUD
- `src/app/(app)/share/page.tsx` — public report
- `src/components/AppShell.tsx` — sidebar + mobile nav including Financial Twin, Scenarios, Receipts
- `src/app/true-cost-of-car/page.tsx` — SEO alias
- `src/app/car-cost-calculator/page.tsx` — SEO alias
- `src/app/fuel-cost-calculator/page.tsx` — SEO alias
- `src/app/car-depreciation-calculator/page.tsx` — SEO alias
- `src/app/car-comparison/page.tsx` — SEO + comparison page
- `tests/finance.test.ts` — updated for new API
- `tests/finance-double-count.test.ts` — NEW (regression tests)

## Database Migrations

No destructive migrations. The previous `add_savings_goal` migration remains in history.

## Test Results

```
Test Files  6 passed (6)
Tests       38 passed (38)
```

## Build Result

`npm run build` succeeds. Production deployment on Vercel will auto-pick up the new commit.

## Remaining External Configuration

These MUST be set in Vercel before production:

```
AUTH_SECRET          (REQUIRED — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DATABASE_URL         (Neon connection string)
NEXT_PUBLIC_APP_URL  (https://lead-gen-2-pearl.vercel.app)
STRIPE_SECRET_KEY    (REQUIRED for billing)
STRIPE_WEBHOOK_SECRET(REQUIRED for webhooks)
STRIPE_PRICE_PRO     (REQUIRED — from Stripe Dashboard)
STRIPE_PRICE_FAMILY  (REQUIRED)
STRIPE_PRICE_PRO_PLUS (REQUIRED)
STRIPE_MODE          (test | live)
SMTP_HOST            (OPTIONAL — defaults to console provider)
SMTP_USER / SMTP_PASS
OPENAI_API_KEY       (OPTIONAL — AI assistant falls back to deterministic if missing)
```

Production safety audit (`assertProdOnBoot`) refuses to start with a weak AUTH_SECRET.

## Verified Routes

```
/                          (landing)
/login, /signup
/dashboard, /garage, /garage/new, /garage/[id]
/expenses, /expenses/new, /expenses/[id]
/fuel, /fuel/new
/financial-twin             (NEW)
/scenarios
/insights
/reports
/receipts                  (NEW)
/goals                     (NEW)
/settings, /settings/billing
/pricing, /features, /docs, /faq
/calculators/car-cost
/calculators/fuel-cost
/calculators/depreciation
/calculators/repair-vs-replace
/calculators/ev-vs-gas
/car-cost-calculator       (alias → /calculators/car-cost)
/fuel-cost-calculator      (alias → /calculators/fuel-cost)
/car-depreciation-calculator (alias → /calculators/depreciation)
/true-cost-of-car          (alias → /calculators/car-cost)
/car-comparison
/terms, /privacy, /acceptable-use, /refund-policy
/share?token=…             (public report)
```
