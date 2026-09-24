# AUTOECO — Status (audit + fix session)

## Implementation Audit (post-fix session)

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Auth (signup/login/logout/reset/verify) | ✅ IMPLEMENTED | JWT + bcrypt + rate limit |
| 2 | Dashboard | ✅ IMPLEMENTED | Real KPIs from DB; primary vehicle shown |
| 3 | Garage (CRUD) | ✅ IMPLEMENTED | Create, edit (PATCH API + page), delete, primary switch |
| 4 | Expenses CRUD | ✅ IMPLEMENTED | Create, edit (NEW: `/expenses/[id]`), delete, 14 categories, filters |
| 5 | Fuel tracking | ✅ IMPLEMENTED | Create, list, auto-consumption calc, kWh (EV) |
| 6 | Financial engine | ✅ IMPLEMENTED | summarizeExpenses, computeDepreciation, projectCost, trueOwnershipCost, estimateCO2Kg |
| 7 | Financial Twin | ✅ IMPLEMENTED | Vehicle detail page shows live Financial Twin |
| 8 | What-If scenarios | ✅ IMPLEMENTED | Form + save + listing |
| 9 | Ask My Car's Money | ✅ IMPLEMENTED | Deterministic grounded Q&A (no AI hallucination) |
| 10 | Stripe subscriptions | ⚠️ PARTIALLY IMPLEMENTED | Schema + checkout endpoints exist; price IDs not yet linked to new Plan keys |
| 11 | Settings | ✅ IMPLEMENTED | Profile, preferences, password, delete account |
| 12 | Mobile responsive | ✅ IMPLEMENTED | Bottom nav, responsive grids, touch-friendly forms |
| 13 | Public calculators | ✅ IMPLEMENTED | car-cost, fuel-cost, depreciation, repair-vs-replace, ev-vs-gas |
| 14 | SEO pages | ✅ IMPLEMENTED | /, /pricing, /features (FIXED), /docs (FIXED), /faq (FIXED), /calculators/* |
| 15 | Authorization / security | ✅ IMPLEMENTED | assertOwnership on every route, IDOR-safe |
| 16 | Reports | ✅ IMPLEMENTED | /reports with cost-of-ownership, breakdown, forecast, depreciation |

## Implemented

- Landing page (hero, features, CTA)
- Authentication end-to-end (signup, login, logout, JWT cookies, bcrypt)
- Email verification + password reset tokens
- 14-day configurable free trial
- 3-step onboarding (currency / distance / fuel unit)
- Garage CRUD (create, edit, delete, set primary, archive)
- Expenses CRUD with 14 categories, mileage, merchant, notes, recurring flag
- Fuel tracking (liters or kWh, automatic L/100km consumption on full-tank fills)
- Financial engine (pure functions, tested)
- Financial Twin displayed on the vehicle detail page
- What-If scenarios (fuel change, horizon, replacement)
- Ask My Car's Money — grounded Q&A over real DB rows (no AI hallucination)
- Insights page (monthly bars, forecast, all-vehicles table)
- Reports page (cost of ownership, breakdown, forecast, depreciation)
- Settings (profile / preferences / password / delete)
- Mobile bottom nav (Home / Garage / Add / Insights / Profile)
- 5 public calculators
- 3 SEO pages (features, docs, faq)
- Pricing page reading plans from DB

## Partially implemented

- Stripe: the existing `src/lib/stripe.ts` still references the LeadGen era.
  Plans in DB have `stripePriceId` set via the earlier set-stripe-prices script.
  Checkout endpoint reads plans and creates a Stripe Checkout session correctly.
  Webhook is idempotent (WebhookEvent table).
  **Limitation:** no admin UI to edit `stripePriceId` from the admin console (was deleted with the admin pages during cleanup). Price IDs must be set via the `set-stripe-prices.ts` script.

## UI only

- The dashboard cards reference "AI scans" / "AI conversations" counters but the AI Q&A is deterministic and not LLM-backed; the counters are wired to expense.source = receipt_scan rows (which the demo seed doesn't create).

## Missing

- Receipt OCR scanner (requires OpenAI key)
- Admin console UI (plans CRUD, coupons CRUD, affiliates management, settings editor)
- Affiliate / referral program UIs
- Documents upload (signed URLs)
- Shareable report links
- Achievement gamification

## Broken (FIXED this session)

- `/features` returned 404 → **FIXED** (now a proper features grid)
- `/docs` returned 404 → **FIXED** (real documentation)
- `/faq` missing → **FIXED** (11-item FAQ with real AutoEco copy)
- `/reports` directory existed with no page.tsx → **FIXED** (full cost-of-ownership report)
- Expense edit/delete had no UI page → **FIXED** (`/expenses/[id]` page with edit form + delete button)
- No mobile bottom navigation → **FIXED**

## Blocked

- OpenAI / LLM provider key → no AI assistant, no OCR
- Live Stripe account → plan price IDs need to be set with the script

## Remaining blockers (before public launch)

1. Change `AUTH_SECRET` in Vercel env (32+ bytes random)
2. Change seeded passwords (`admin@autoeco.app` / `change-me-admin`)
3. Activate SMTP (currently console provider)
4. Move Stripe to live mode + real price IDs
5. Legal pages need lawyer review
6. Custom domain
7. Turnstile CAPTCHA on signup

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 warnings |
| `npm test` | 25 / 25 passing |
| `npm run build` | OK (Next.js 14 production) |
| Deployment | Pushed to `main`; Vercel auto-deploys |
