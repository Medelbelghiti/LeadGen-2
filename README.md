# LeadGen 2.0

> **Global business lead discovery platform — built as a commercial multi-tenant SaaS.**

LeadGen 2.0 lets you search **any legitimate business niche** in **any supported country** and city, automatically deduplicates results from multiple data providers (OpenStreetMap and Google Places), scores data quality, and lets you manage the results in a built-in CRM with CSV/XLSX/JSON export.

This repository contains the complete commercial SaaS layer:

* Authentication (signup, login, logout, email verification, forgot/reset password, change password, delete account)
* Multi-tenant data isolation with role-based access
* Configurable Free Trial (duration, lead/search/export limits)
* Configurable Plans (name, price, billing period, all limits, providers, features, Stripe price IDs)
* Stripe billing (checkout, customer portal, subscriptions, one-time Lifetime, webhooks, invoices, refunds, upgrade/downgrade, cancellation)
* Idempotent Stripe webhook processing (no double-credits)
* Server-side usage ledger — every lead, search, and export is counted regardless of UI state
* Coupon system (percent/fixed, first purchase / first month / forever, expiry, plan-restricted, redemption limits)
* Referral program (configurable rewards: bonus leads, percent commission, or a free month of a plan)
* Affiliate program (configurable commission, cookie duration, payouts, status workflow)
* Multi-provider search architecture (Demo, OpenStreetMap, Google Places)
* International phone normalization (E.164 via libphonenumber-js)
* Intelligent deduplication (phone, domain, sourceId, name similarity, coordinates, address)
* Data Quality Score (0–100, completeness, with per-field missing list)
* Customer REST API (API keys, hashed, revocable, rate-limited)
* Admin console (overview, plans CRUD, coupons CRUD, affiliates management, provider config, users, settings, feature flags)
* Privacy: cookie consent, no unnecessary tracking, separate essential/analytics/marketing
* i18n (English, French, Arabic with RTL) via translation files
* Anti-abuse: per-IP rate limiting on auth/search/export, account lockout, optional CAPTCHA
* Notifications + transactional emails for all key events (trial started, payment success/failed, etc.)

---

## Architecture

```
Visitor
  ↓
Landing Page → Signup → Free Trial → Dashboard
                                          ↓
                          Search Engine (orchestrator)
                              ├── Demo Provider  (deterministic, synthetic, labeled)
                              ├── OpenStreetMap (Nominatim + Overpass)
                              └── Google Places (optional, requires key)
                                          ↓
                          Normalize → Deduplicate → Score
                                          ↓
                          Lead storage (per-user) → CRM → Export
```

### Tech stack

| Layer        | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 14 (App Router) + React 18                  |
| Language     | TypeScript (strict)                                 |
| Database     | Prisma 5 — SQLite (dev) / PostgreSQL (prod)        |
| Auth         | Custom JWT (jose) + bcryptjs session cookies        |
| Billing      | Stripe SDK + secure webhook                          |
| i18n         | Translation files (en/fr/ar) with RTL support        |
| Styling      | Tailwind CSS                                         |
| Email        | Nodemailer abstraction (Console default / SMTP)      |
| Phone        | libphonenumber-js                                    |
| Exports      | CSV (hand-rolled) / XLSX (`xlsx`) / JSON             |
| Tests        | Vitest                                               |

---

## Quick start

### Prerequisites

* Node.js ≥ 20
* npm ≥ 10

### Installation

```bash
git clone <repo>
cd LeadGen
npm install
cp .env.example .env
# Edit .env and set AUTH_SECRET (32+ random bytes):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Open <http://localhost:3000>.

### Seeded credentials

| Role  | Email                | Password          |
| ----- | -------------------- | ----------------- |
| Admin | `admin@example.com`  | `change-me-admin` |
| User  | `demo@example.com`   | `demo-password`   |

**Change both passwords immediately in any non-development environment.**

---

## Environment variables

See `.env.example`. All Stripe, SMTP, AI, and Google Places keys are **optional** — the core application works without them:

| Variable                          | Required | Purpose |
| --------------------------------- | -------- | ------- |
| `DATABASE_URL`                    | yes      | Prisma connection string |
| `AUTH_SECRET`                     | yes      | 32+ byte random hex for sessions and API-key HMAC |
| `NEXT_PUBLIC_APP_URL`             | yes      | Public base URL (emails, Stripe redirects) |
| `STRIPE_MODE`                     | no       | `test` or `live` |
| `STRIPE_SECRET_KEY`               | for billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET`           | for billing | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for billing | Stripe publishable key |
| `EMAIL_PROVIDER`                  | no       | `console` (default) or `smtp` |
| `SMTP_HOST`, `SMTP_PORT`, etc.    | for SMTP | Email provider credentials |
| `GOOGLE_PLACES_API_KEY`           | no       | Enables Google Places (optional; OSM + Demo work without it) |
| `OSM_NOMINATIM_URL`               | no       | Override Nominatim endpoint |
| `OSM_OVERPASS_URL`                | no       | Override Overpass endpoint |
| `CAPTCHA_PROVIDER`, `TURNSTILE_SECRET_KEY` | no | Optional Cloudflare Turnstile |
| `AI_ENRICHMENT_ENABLED`, `OPENAI_API_KEY` | no | Optional AI enrichment |

---

## Testing & verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Production deployment

1. Set `NODE_ENV=production`
2. Configure all required environment variables
3. `npm run build`
4. `npm run prisma:deploy`
5. `npm run prisma:seed` (only on first run, idempotent)
6. `npm start`
7. In the Stripe dashboard, create a webhook endpoint pointed at `https://yourdomain.com/api/stripe/webhook`
8. In Cloudflare/your reverse proxy, set the right `X-Forwarded-For` policy for IP-based rate limiting

---

## Provider coverage & limitations

* LeadGen 2.0 **never fabricates** business information.
* Coverage depends entirely on the configured providers. With the default OSM + Demo setup, you can search anywhere in the world; the result count depends on what's publicly available in OpenStreetMap.
* Google Places is optional and requires your own API key + billable account.
* The Demo provider returns clearly-labeled synthetic records so you can test the UI without any API credentials. Demo records are tagged `isDemo: true` and are never mixed with real ones.

---

## Adding a new provider

1. Create `src/providers/<name>/index.ts`
2. Implement `BusinessDataProvider` from `src/providers/types.ts`
3. Register it in `src/providers/index.ts`
4. Add it to the default `providers` list in the admin plan config

---

## Security

* Passwords are bcrypt-hashed (12 rounds).
* Sessions are JWT (jose) in `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookies.
* API keys are HMAC-SHA-256-hashed with `AUTH_SECRET` at rest and never stored in plaintext.
* Every API route enforces auth (`requireUser` / `requireAdmin`).
* Every resource fetch verifies `resourceUserId === user.id` to prevent IDOR.
* Rate limiting is enforced on signup, login, and search endpoints (DB-backed sliding window).
* Stripe webhook signatures are verified with `stripe.webhooks.constructEvent`.
* Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`) are sent by default.
* The `LIMIT_REACHED` error prevents paid provider requests when a user is over quota.

---

## Known limitations

* The default background-job runner is in-process — adequate for Node servers, but for high-throughput or serverless deploys swap `runSearchJob` for a real queue (BullMQ + Redis).
* The default email provider is `console` (logs to stdout). Configure SMTP for production.
* Stripe is optional in the sense that the app boots and works without it; paid plans require configuring Stripe.
* No real-time progress streaming — clients poll `GET /api/search/:id`.

---

## License

Proprietary — all rights reserved by the copyright holder.
