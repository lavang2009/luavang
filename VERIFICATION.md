# Lù A Vang — Final Vercel Audit (2026-09-18)

## Static verification
- TypeScript/TSX/JS-family source files: 103
- Parser errors: 0
- Internal `@/` alias import failures: 0
- Relative import failures: 0
- Client/server boundary violations detected by static scan: 0
- Environment variables used/documented: 23/23
- `@ts-ignore` / `@ts-expect-error` in source: 0
- localhost/127.0.0.1 in source: 0
- `eval` / `new Function`: 0
- `innerHTML` assignments: 0
- literal private-key blocks: 0
- public Firestore allow-all rule: 0
- JSON validation: package.json, tsconfig.json, firebase.json, firestore.indexes.json, storage.cors.json all valid
- API route files: 33
- App pages: 28

## Vercel-specific fixes
- Node runtime pinned to 24.x; `.nvmrc` and `.node-version` pin 24.21.0.
- Next.js/Firebase/Tailwind stack updated to the audited stable versions in package.json.
- Large digital-file uploads no longer pass through a Vercel Function; admin flow uses short-lived V4 signed PUT URLs directly to Firebase Storage.
- Private file delivery uses short-lived signed GET URLs after server-side ownership/order checks.
- Firebase Admin SDK is isolated to server code.
- Payment webhooks/credits are server-only and idempotent.
- Checkout pricing, wallet mutations, voucher validation, and ACC locking are server-authoritative.

## Build limitation
The sandbox has no usable npm registry/DNS access and no project node_modules for the updated dependency set. An offline install fails because the needed package metadata is not cached. Therefore this audit does NOT claim that `npm run build` has executed successfully in this sandbox.

The intended Vercel build sequence is:
1. `npm install`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

The previous user-provided Vercel log stopped after dependency installation (`added 566 packages in 1m`), before the actual build output. Deprecation warnings shown there are warnings, not proof of the build failure.
