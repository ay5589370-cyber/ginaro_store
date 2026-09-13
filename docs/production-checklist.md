# GINARO Production Checklist

Use this before deployment. Do not deploy automatically from a development task.

## Environment

- [ ] Configure client env variables in Vercel: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] Configure server env variables in Vercel: `APP_BASE_URL`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Configure NVIDIA server env variables: `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_BASE_URL`.
- [ ] Configure email server env variables: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`.
- [ ] Confirm no `VITE_NVIDIA_API_KEY`, `VITE_RESEND_API_KEY`, or `VITE_SUPABASE_SERVICE_ROLE_KEY` exists.

## Firebase

- [ ] Deploy Firestore rules with `firebase deploy --only firestore:rules`.
- [ ] Deploy Firestore indexes with `firebase deploy --only firestore:indexes`.
- [ ] Confirm users cannot edit their own `role`.
- [ ] Confirm customers cannot write products, orders, review aggregates, or email notification metadata.
- [ ] Add production/custom domain to Firebase Authentication Authorized Domains.

## Supabase

- [ ] Confirm public product image bucket/policies expose only intended storefront images.
- [ ] Confirm `custom-designs` bucket remains private.
- [ ] Confirm signed URLs are short-lived and generated only after Firebase token and design ownership checks.
- [ ] Confirm service-role key is server-side only.

## Core Store Flows

- [ ] Home, Shop, Search, Product Details, Cart, Checkout, and Order Success load without console errors.
- [ ] Product search and autocomplete use Firestore products only.
- [ ] Add to cart works with valid variants and handles out-of-stock products.
- [ ] COD checkout creates orders through `/api/orders/create`.
- [ ] Backend validates prices, quantities, stock, active status, shipping, discounts, size, and color.
- [ ] Stock decrements once on successful order creation.
- [ ] Eligible cancellation restores inventory exactly once.
- [ ] Over-quantity order attempts are rejected without creating an order.

## Account And Admin

- [ ] Customer is blocked from `/admin`.
- [ ] Admin can manage products, stock, orders, customers, and reviews.
- [ ] Admin order status transitions follow the allowed progression.
- [ ] Account Orders and Order Details show only the signed-in customer's orders.
- [ ] Empty cart, wishlist, addresses, designs, orders, reviews, and search results have usable states.

## Reviews

- [ ] Non-delivered purchases cannot create reviews.
- [ ] Delivered purchases can create one verified review per product.
- [ ] Users cannot edit or delete another user's review.
- [ ] Product rating and review count are updated only through trusted backend review APIs.

## AI Assistant

- [ ] React calls only `/api/ai/chat`.
- [ ] Browser bundle contains no `NVIDIA_API_KEY`.
- [ ] NVIDIA prompt-injection test refuses secret/system-prompt disclosure.
- [ ] Queries like black vest, budget vest, summer pajama, and Hinglish requests return real product IDs only.
- [ ] NVIDIA failure falls back to local product discovery without crashing the app.
- [ ] Rate limiting returns a friendly response under repeated requests.

## Email

- [ ] Resend key is server-side only.
- [ ] Order placed customer email is attempted after order transaction success.
- [ ] Admin new-order email is attempted after order transaction success.
- [ ] Confirmed, processing, shipped, delivered, and cancelled customer emails send once per successful status event.
- [ ] Email failure does not roll back order creation, status update, or cancellation.
- [ ] Production Resend sender domain is verified.

## SEO, Security, And Performance

- [ ] Default title, description, and Open Graph metadata are production-appropriate.
- [ ] Product page title uses product name.
- [ ] `robots.txt` blocks private operational routes.
- [ ] Security headers are configured in `vercel.json`.
- [ ] Unknown routes fall back to the React app and show the 404 page.
- [ ] Major pages are checked at 320px, 375px, 430px, 768px, 1024px, and 1440px.
- [ ] Admin, account, customizer, checkout, and AI chunks lazy-load successfully.
- [ ] Product images have fallbacks and lazy loading where appropriate.

## Final Commands

- [ ] `npm audit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run preview`
- [ ] `vercel dev` API smoke tests
- [ ] Final test COD order
