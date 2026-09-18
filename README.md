# LÙ A VANG — ACC + FILE DIGITAL Commerce

Production-oriented Next.js 16 App Router ecommerce application for **Lù A Vang**. The project is designed around server-authoritative pricing, wallet mutations, protected digital delivery, Firebase Authentication/Firestore/Storage, an admin area, and provider adapters for SePay + NAPPay.

## Important payment integration note

The SePay adapter follows the official webhook authentication model (API Key or HMAC-SHA256 can be configured on the provider side). The NAPPay card top-up adapter follows the official Charging v2 contract: `https://nappay.vn/chargingws/v2`, commands `charging` and `check`, `partner_id`, unique `request_id`, and the documented MD5 signing formulas. The code does **not** contain real provider credentials and will fail closed until environment variables are configured.


## Runtime / dependency baseline

The deployment baseline in this artifact is pinned to the current stable releases checked on 18 September 2026: Next.js 16.3.5, React 19.3.0, Firebase Web 12.19.0, Firebase Admin 14.4.0, Tailwind CSS 4.3.3, ESLint 10.10.0, TypeScript 7.0.2, Motion 13.4.0, Zustand 5.0.15, and Lucide React 1.47.0. Node.js is pinned to the 24.x LTS line in `package.json` for Vercel compatibility. Motion and Zustand are also pinned to the latest stable versions verified in the same audit.

## Features

- Dark neon/glass UI with responsive mobile navigation.
- Firebase email/password + Google authentication.
- User profile, wallet balance, transactions, orders, favorites, notifications.
- Server-side checkout with Firestore transactions.
- ACC inventory locking using transaction + encrypted credentials.
- Private file delivery via Firebase Storage signed URLs.
- Voucher rules: percentage/fixed, minimum order, max discount, expiry, usage limits, product/category limits.
- SePay bank transfer deposit creation + webhook idempotency.
- NAPPay Charging v2 card top-up adapter + status checking + idempotency.
- Admin dashboard for users/products/inventory/orders/deposits/vouchers.
- Security-oriented Firestore rules; sensitive state is server-written.
- SEO metadata, robots, sitemap, headers.
- No fake products, fake payment success, fake sales counters, or automatic production seeding.

## 1. Install

Use Node.js 24.x. The `engines` field pins the deployment baseline to the 24.x branch.


```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Firebase

Create a Firebase project and enable:

- Authentication → Email/Password
- Authentication → Google
- Firestore Database
- Storage

Add your web app values to the `NEXT_PUBLIC_FIREBASE_*` variables.

For the Admin SDK, create a service account and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the server. In Vercel, paste the private key preserving `\n` line breaks or use a single-line escaped value.

Deploy the included Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## 3. Collections

- `users/{uid}`
- `users/{uid}/favorites/{productId}`
- `users/{uid}/notifications/{notificationId}`
- `users/{uid}/transactions/{transactionId}`
- `products/{productId}`
- `products/{productId}/inventory/{itemId}`
- `orders/{orderId}`
- `deposits/{depositId}`
- `vouchers/{voucherId}`
- `voucherRedemptions/{voucherId_uid}`
- `publicActivity/{activityId}` (safe public product-level activity only)

## 4. Admin setup

The app does not let clients choose `role=admin`. Set a Firebase custom claim from a secure server/admin environment:

```ts
await getAuth().setCustomUserClaims(uid, { admin: true });
```

Then ask the user to sign out/in again so the ID token refreshes. Admin API routes verify the Firebase ID token and the `admin` claim server-side.

## 5. SePay

Create the webhook in the SePay dashboard pointing to:

`POST /api/payments/sepay/webhook`

For production, configure HTTPS and use a supported authenticated webhook mode. This project accepts `Authorization: Apikey ...` when `SEPAY_API_KEY` is set, or `X-SePay-Signature` + `X-SePay-Timestamp` when `SEPAY_WEBHOOK_SECRET` is set.

Set:

- `SEPAY_BANK_CODE`
- `SEPAY_ACCOUNT_NUMBER`
- `SEPAY_ACCOUNT_NAME`
- `SEPAY_PAYMENT_PREFIX`
- `SEPAY_API_KEY` or `SEPAY_WEBHOOK_SECRET`

The deposit page creates a unique payment code such as `LV123456`. The QR encodes the actual bank transfer destination and payment content; the credit is only performed by the verified webhook.

## 6. NAPPay

Official Charging v2 values used by the adapter:

- Endpoint: `https://nappay.vn/chargingws/v2`
- `charging` and `check`
- `partner_id`
- unique `request_id`
- signing formulas based on `partner_key`

Set `NAPPAY_PARTNER_ID`, `NAPPAY_PARTNER_KEY`, and optionally override `NAPPAY_ENDPOINT`. The adapter deliberately never calls NAPPay directly from the browser.

## 7. Storage / digital files

Admin upload intentionally does **not** stream a large file through a Vercel Function. The admin page requests a short-lived V4 signed `PUT` URL, uploads directly from the browser to private Firebase/Google Cloud Storage, then calls a small commit endpoint. This avoids the Vercel serverless request-body limit for large uploads.

Before using this in production, apply `storage.cors.json` to the Firebase Storage bucket. The included CORS allows browser upload to the signed URL; the signed URL itself remains short-lived and object-specific.

The commit endpoint stores only the private Storage path on the product. Public users cannot list or read paid assets through Firestore rules. After a completed order, `/api/downloads/[orderId]/[itemId]` verifies ownership and returns a short-lived signed URL.

## 8. Local validation

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## 9. Vercel

- Import the repository.
- Add all production Environment Variables.
- Ensure `APP_BASE_URL` is the production HTTPS origin.
- Add your Vercel production/staging domains to Firebase Authentication → Authorized domains.
- Configure SePay webhook URL to the production route.
- Never commit `.env.local` or service-account JSON.

## 10. Production checklist

- [ ] Firebase Auth enabled
- [ ] Firestore + Storage deployed
- [ ] Admin custom claim set server-side
- [ ] Firestore rules deployed
- [ ] Storage rules deployed/configured
- [ ] Storage CORS applied for direct signed uploads
- [ ] SePay authenticated webhook tested with real provider event
- [ ] NAPPay credentials + IP whitelist configured if required
- [ ] Private storage paths only
- [ ] Vercel env vars configured
- [ ] `npm run check` passes
- [ ] Real test deposit/order completed with a low-value amount
- [ ] No production demo seed executed

> Version audit: package versions are pinned to the stable releases verified on 18 September 2026 from npm package metadata.

## Architecture

Business rules live in server-side services under `services/` and `lib/server/`. Route handlers are thin adapters that validate input, authenticate/authorize, call business logic, and return stable JSON error envelopes.

## Validation note for this build artifact

The source was statically reviewed in the build sandbox. The sandbox could not resolve `registry.npmjs.org`, so dependencies could not be installed here and a truthful `npm run build` result cannot be claimed from this environment. Run `npm install`, `npm run typecheck`, `npm run lint`, and `npm run build` on a machine/network with npm registry access before production deployment.

Admin product delete is implemented as a **soft delete** (`status=inactive`) to preserve order history. Admin refund is server-side/idempotent per order and credits the wallet inside a Firestore transaction with an audit reason.

See `ARCHITECTURE.md` for the product/system boundaries and `VERIFICATION.md` for the checks performed before packaging.
