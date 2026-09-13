# Custom Design Upload Bridge

The custom design upload bridge is implemented as Vercel-style serverless API routes under `/api/custom-designs`.

## Required Environment Variables

Client-side Vite variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

`FIREBASE_ADMIN_PRIVATE_KEY` may use escaped newlines as `\n`; the server initializer converts them at runtime.

## Flow

1. React saves custom design metadata under `users/{uid}/designs/{designId}`.
2. React calls `/api/custom-designs/upload` with `Authorization: Bearer <firebase-id-token>`.
3. The API verifies the Firebase ID token with Firebase Admin.
4. The API verifies the design document exists under the verified user's UID.
5. The API uploads the image to the private Supabase `custom-designs` bucket using the server-only service role key.
6. React updates Firestore with the returned `storagePath`.
7. React requests short-lived signed URLs from `/api/custom-designs/signed-url` for display.

## Local Testing

Use a serverless runtime that serves the `/api` directory, such as:

```bash
vercel dev
```

Then run the normal frontend checks:

```bash
npm run lint
npm run build
```

Unauthenticated upload requests should return `401`. Valid Firebase users can upload only to designs under their own `users/{uid}/designs/{designId}` path.
