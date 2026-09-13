# GINARO Storefront

GINARO is a React + Vite e-commerce storefront backed by Firebase Authentication, Firestore, Supabase Storage, Vercel-style serverless APIs, Groq for the shopping assistant, and Resend for transactional email.

The store is Cash on Delivery only. Do not add browser-side payment keys or online-payment checkout without a separate security review.

## Requirements

- Node.js 20 or newer
- npm
- Firebase project with Authentication and Firestore
- Supabase project with public product-image storage and private custom-design storage
- Vercel CLI for local `/api` serverless testing
- Groq API key and model ID for the AI shopping assistant
- Resend API key and verified sender domain for production transactional email

## Install

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env.local` for local development and fill in real values locally only. Never commit real credentials.

Client variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server variables:

- `APP_BASE_URL`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_BASE_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_NOTIFICATION_EMAIL`

Never create `VITE_GROQ_API_KEY`, `VITE_RESEND_API_KEY`, or `VITE_SUPABASE_SERVICE_ROLE_KEY`.

## Local Development

For frontend work and local API testing:

```bash
npm run dev
```

The Vite dev server mounts the existing `/api` handlers locally for checkout/orders, reviews, custom-design assets, admin order updates, and the Groq-backed shopping assistant without exposing server keys to React.

For Vercel parity before deployment, also run:

```bash
vercel dev
```

## Firebase Setup

Deploy Firestore rules and indexes after review:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

When adding a production or custom domain, verify it in Firebase Authentication Authorized Domains.

## Supabase Setup

- Keep product image assets public only when intended for storefront display.
- Keep `custom-designs` private.
- Use signed URLs from the trusted backend for private custom-design assets.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## Groq Setup

- Configure `GROQ_API_KEY`, `GROQ_MODEL`, and `GROQ_BASE_URL` only in server environments.
- React calls only `/api/ai/chat`.
- The server loads real Firestore products, narrows candidates, calls Groq, validates structured JSON, and resolves final product facts from trusted product data.

## Email Setup

- Configure `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, and `APP_BASE_URL` only in server environments.
- Transactional emails are secondary side effects. Order creation, status changes, and cancellations must remain successful even if email sending fails.
- Production sender domains may need verification in Resend before launch.

## Quality Checks

```bash
npm audit
npm run lint
npm run build
npm run preview
```

Use `npm audit fix` only after reviewing the proposed non-breaking fix. Do not use `npm audit fix --force` without a dedicated upgrade review.
