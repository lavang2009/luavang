# LÙ A VANG — Architecture Map

## Product architecture

**Public:** home, shop, product detail, auth, FAQ.

**Commerce:** cart → checkout → server validation → Firestore transaction → ACC/file delivery.

**Wallet:** bank deposit through SePay webhook or card top-up through NAPPay Charging v2.

**Delivery:** ACC credentials are encrypted in inventory and order-delivery records. Files stay in private Firebase Storage and are exposed through short-lived signed URLs.

**Admin:** Firebase custom claim `admin=true` + server-side verification on every admin API.

## Data boundaries

- Browser receives only public product fields.
- Public product APIs never expose `fileStoragePath`.
- Browser cannot write wallet balance, role, order status, deposit status, inventory status, or payment status directly.
- Private file uploads do not pass through Vercel Functions; admin receives a short-lived signed Storage PUT URL.
- Admin SDK performs sensitive mutations.

## Payment boundaries

Payment provider adapters live under `services/payments/`. Route handlers validate/authenticate inputs and pass trusted values into provider-neutral operations. Provider secrets are server-only.

## Inventory / order atomicity

Wallet checkout requires a unique idempotency key. Inside a Firestore transaction it reads the user, products, voucher/redemption and ACC inventory before performing writes, then atomically decrements balance, marks inventory sold, records encrypted delivery, updates counters, creates the order, and records the idempotency key.

## Digital file architecture

Admin file upload is a two-phase flow:

1. server validates product/file metadata and issues a short-lived V4 signed PUT URL;
2. browser uploads directly to private Firebase/Google Cloud Storage;
3. commit route verifies object existence, size/type and upload ownership before linking the private path to the product.

Completed orders receive a short-lived signed read URL only after ownership/order-status checks.

## Notifications

Private transactional notifications live under the user document. System announcements live in `systemAnnouncements` so an admin broadcast does not fan-out thousands of writes in one Vercel request. User read-state for announcements is stored under `users/{uid}/notificationReads`.

## Failure model

APIs return `{ ok: false, error: { code, message } }` for ordinary failures. Internal database/provider errors are not returned as stack traces. Provider payment credits fail closed when configuration or signature verification is missing.

## Deployment model

Next.js 16 App Router on Vercel, Node 24.x LTS, Firebase Auth/Firestore/Storage, server-only Firebase Admin credentials, and provider secrets in Vercel Environment Variables.
