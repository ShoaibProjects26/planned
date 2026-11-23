# Planned — Home education, done for you

AI-powered homeschool planning for UK families. Generate personalised lesson plans, track progress, celebrate milestones with Bloom, and keep a beautiful learning journal.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma (Neon recommended; any Postgres works) |
| Auth | NextAuth.js (credentials) |
| AI | Google Gemini (gemini-2.5-flash-lite) |
| Payments | Stripe (subscriptions + webhooks) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Local development

### 1. Clone and install

```bash
git clone <repo-url>
cd planned
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local` (see comments in the file).

### 3. Set up the database

Create a free Postgres database (e.g. on [Neon](https://neon.tech)) and copy the **pooled** connection string into `DATABASE_URL` and the **direct** connection string into `DIRECT_URL` in `.env.local`. Then apply the migrations:

```bash
npm run db:deploy
```

**Existing database that was set up with `db push`?** Mark the baseline as already applied first, then deploy the newer migrations:

```bash
npx prisma migrate resolve --applied 0_init
npm run db:deploy
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Stripe setup

1. Create a Stripe account and get your API keys from the [Stripe dashboard](https://dashboard.stripe.com/apikeys).
2. Create two products in Stripe: **Basic** and **Premium**, each with monthly and annual prices (in GBP).
3. Copy the price IDs into `.env.local`.
4. Run the Stripe CLI to forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
5. Copy the webhook signing secret output by the CLI into `STRIPE_WEBHOOK_SECRET`.

Checkout is **disabled** until `PAYMENTS_ENABLED=true` and `NEXT_PUBLIC_PAYMENTS_ENABLED=true` are both set.

### Subscription tiers

| Tier | Price | Children | Worksheets | Journal | PDF / day outs / AI chat |
|---|---|---|---|---|---|
| Free | £0 | 1 | ✗ | ✗ | ✗ |
| Basic | £7.99/mo · £69/yr | 2 | Printable | ✓ | ✗ |
| Premium | £14.99/mo · £129/yr | Up to 5 | Interactive | ✓ | ✓ |

All tiers generate the **current week** only; multi-week planning is not built yet.

---

## Pre-launch checklist (from the security & privacy audit)

Done in code:
- Draft Privacy Policy (`/privacy`) and Terms (`/terms`); consent recorded at sign-up (`User.termsAcceptedAt`, `termsVersion`); existing users are asked to accept before using the dashboard.
- Separate, withdrawable AI-processing consent (`User.aiConsentAt`). AI endpoints refuse without it (`lib/aiGuard.ts`).
- Children's names are replaced with placeholders before any AI request (`lib/ai.ts`).
- Database-backed rate limits, per-user daily AI quotas, and a global daily AI cap (`AI_GLOBAL_DAILY_LIMIT`).
- Sign-up / password-reset throttling, login brute-force limit, optional Cloudflare Turnstile.
- Password reset, email verification (Resend), verify-before-checkout.
- Private photo storage served via `/api/journal/[id]/photo`; photos deleted with entries, children and accounts.
- Edit / delete a child (`/dashboard/children`); full data export (Settings → Privacy & data).
- Payments disabled by flag; pricing claims match built features; placeholder testimonials hidden.
- Error pages, `/api/health`, migrations, unit tests (`npm test`), CI workflow.

**Still needs a person (cannot be done in code):**
- [ ] Transfer GitHub repo, Vercel project, domain, Neon, Stripe, Google Cloud and Resend accounts to company-owned accounts.
- [ ] Have a UK data-protection solicitor review `/privacy` and `/terms`, fill in the `[bracketed]` placeholders, and set `NEXT_PUBLIC_COMPANY_NAME`. Register with the ICO. Complete a DPIA (required for children's data).
- [ ] Use a **paid** (billing-enabled) Gemini key, sign Google's data processing terms, then set `AI_PAID_TIER_CONFIRMED=true`. Set a budget alert / spend cap in Google Cloud Billing.
- [ ] Create a **private** Vercel Blob store and use its token. Old public photos keep working through the proxy but remain reachable by URL until migrated or deleted.
- [ ] Create Resend + Turnstile accounts and set their keys.
- [ ] Have a qualified scholar review the Islamic content prompts and a sample of generated lessons.
- [ ] Set up error monitoring (e.g. Sentry), an uptime check on `/api/health`, and confirm Neon point-in-time-restore backups are enabled.
- [ ] Upgrade Next.js 14 → 15/16 (remaining critical advisory in `npm audit`).
- [ ] Before enabling payments: switch Stripe to live keys, decide refund policy, re-test checkout + webhooks.

---

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add all environment variables from `.env.local.example` in the Vercel project settings.
4. Add your production Postgres URLs (`DATABASE_URL` pooled, `DIRECT_URL` direct) — Neon, Supabase, or Vercel Postgres all work.
5. Add your production domain to `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`.
6. Add your Vercel deployment URL to the Stripe webhook endpoint in the Stripe dashboard, pointing to `https://yourdomain.com/api/stripe/webhook`.

---

## Project structure

```
planned/
├── app/
│   ├── (auth)/            # Sign-in page
│   ├── api/               # Route handlers
│   │   ├── dashboard/     # Dashboard data
│   │   ├── journal/       # Journal CRUD
│   │   ├── lessons/       # Lesson CRUD + AI generation
│   │   ├── stripe/        # Checkout, webhook, portal
│   │   └── user/          # Me, update, delete
│   ├── dashboard/         # Protected dashboard pages
│   ├── onboarding/        # Sign-up wizard
│   ├── pricing/           # Public pricing page
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Landing page
│   ├── robots.ts           # robots.txt
│   └── sitemap.ts          # sitemap.xml
├── components/
│   ├── dashboard/         # Lesson cards, stats, Bloom bar
│   ├── journal/           # Journal modals and cards
│   ├── layout/            # Shell, sidebar, providers
│   └── paywall/           # UpgradePrompt component
├── contexts/              # ActiveChild context
├── lib/
│   ├── ai.ts              # Gemini client (provider-agnostic wrapper)
│   ├── auth.ts            # NextAuth config
│   ├── db.ts              # Prisma client singleton
│   ├── stripe.ts          # Stripe client + PLANS config
│   ├── subscription.ts    # Tier utilities + paywall helpers
│   └── utils.ts           # cn() and shared utils
└── prisma/
    └── schema.prisma      # Database schema
```

---

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm test           # Unit tests (Vitest)
npm run db:deploy  # Apply database migrations
npx prisma studio  # Open Prisma Studio (database GUI)
```
