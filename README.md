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

Create a free Postgres database (e.g. on [Neon](https://neon.tech)) and copy the **pooled** connection string into `DATABASE_URL` and the **direct** connection string into `DIRECT_URL` in `.env.local`. Then push the schema:

```bash
npx prisma db push
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

### Subscription tiers

| Tier | Price | Children | Weeks of lessons | PDF export |
|---|---|---|---|---|
| Free | £0 | 1 | 1 at a time | ✗ |
| Basic | £7.99/mo · £69/yr | 2 | Unlimited | ✗ |
| Premium | £14.99/mo · £129/yr | Unlimited | Unlimited | ✓ |

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
npx prisma studio  # Open Prisma Studio (database GUI)
```
