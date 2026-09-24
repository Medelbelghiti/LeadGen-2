# AUTOECO — Progress

## Current Architecture (post-pivot)

- **Framework**: Next.js 14.2.15 (App Router) + TypeScript strict
- **DB**: Postgres (Neon) via Prisma 5.22
- **Auth**: Custom JWT (jose) + bcryptjs session cookies
- **Billing**: Stripe SDK + idempotent webhooks
- **i18n**: en / fr (drop ar for V1)
- **Styling**: Tailwind CSS — new AutoEco design system (charcoal + emerald + Inter)
- **Icons**: lucide-react
- **Deploy**: Vercel

## Current Schema (already migrated)

- User (auth, profile, preferences, billing, trial)
- VerificationToken
- Plan (free / pro / family / pro_plus)
- Subscription, Invoice, WebhookEvent
- Coupon, CouponRedemption
- VehicleCatalogEntry
- Vehicle
- Expense
- FuelEntry
- Document
- Forecast
- Scenario
- Conversation, ConversationMessage
- Achievement
- Report
- ShareLink
- Notification
- FeatureFlag, Setting, ApiKey, RateLimitEntry
- AuditLog, AnalyticsEvent

## Plan for tonight (V1)

### Working features
- [x] AutoEco branding (landing)
- [x] Inter font + design system (charcoal + emerald)
- [x] DB schema migrated to Neon
- [x] Login / signup pages (branded)
- [x] Dashboard, garage, garage/new pages

### To build (in priority order)
1. [x] Onboarding (currency/distance/fuel)
2. [x] Vehicle CRUD API + detail page
3. [x] Expenses CRUD API + list/new pages
4. [x] Fuel CRUD API + list/new pages
5. [x] Insights page (trends)
6. [x] Scenarios (What-If calculator)
7. [x] AI assistant (stub — answer from real data only)
8. [x] Settings (profile, prefs, billing, delete)
9. [x] Stripe plans API + pricing page
10. [x] Public calculators (car-cost, fuel-cost, depreciation)
11. [x] Signup API cleanup (drop LeadGen fields)
12. [x] Mobile responsive
13. [x] Typecheck + lint + build green

### Blocked / requires credentials
- OpenAI integration for AI chat (architectural stub with hard-coded financial answers from real data)
- Google Places (V2 — manual entry is the V1 path)
- Email SMTP (Console provider is fine for V1)

## Risks

- Many LeadGen files still reference deleted Prisma fields (referralCode, bonusLeads, monthlyLeadLimit, etc.)
- Signup API still references dropped columns
- Several lib files (referrals, affiliates, stripe.ts) reference dropped models
- Stripe webhook handler still uses old subscription logic

## Strategy

Stabilize by rewriting the **fewest possible files** to compile + run V1 features.
Do NOT touch admin pages, referrals, affiliates, coupons — those are V2.
Do NOT rebuild Stripe checkout; keep the working endpoints as-is (they work against the new Plan schema).
