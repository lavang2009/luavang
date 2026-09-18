import { NextRequest, NextResponse } from 'next/server';
import { errorStatus } from '@/lib/server/auth';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, code = 'BAD_REQUEST') {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const publicCodes = new Set([
  'UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','INVALID_AMOUNT','INVALID_PAYMENT_AMOUNT',
  'RATE_LIMITED','CART_EMPTY','CART_TOO_LARGE','FILE_QUANTITY_MUST_BE_ONE',
  'PRODUCT_UNAVAILABLE','OUT_OF_STOCK','FILE_NOT_CONFIGURED','INSUFFICIENT_BALANCE',
  'VOUCHER_INVALID','VOUCHER_ALREADY_USED','VOUCHER_EXHAUSTED','VOUCHER_CATEGORY_RESTRICTED',
  'VOUCHER_PRODUCT_RESTRICTED','ALREADY_FINAL','ALREADY_CREDITED','ACCOUNT_BLOCKED',
  'USER_NOT_FOUND','NAPPAY_NOT_CONFIGURED','NAPPAY_HTTP_ERROR','SEPAY_BANK_NOT_CONFIGURED',
  'AMOUNT_MISMATCH','DEPOSIT_NOT_FOUND','PAYMENT_CODE_NOT_FOUND','NOT_INCOMING_TRANSFER',
  'ACCOUNT_MISMATCH','PROVIDER_TRANSACTION_ID_MISSING','PRODUCT_REQUIRED','NOT_FOUND',
  'FILE_NOT_READY','ORDER_NOT_COMPLETED','ORDER_NOT_FOUND','NOT_ALLOWED',
  'FILE_SIZE_TOO_LARGE','FILE_TYPE_NOT_ALLOWED','UPLOAD_EXPIRED','UPLOAD_NOT_FOUND',
  'UPLOAD_NOT_READY','INVALID_UPLOAD','CHECKOUT_IDEMPOTENCY_REQUIRED','INVALID_IDEMPOTENCY_KEY',
]);

export function handleApiError(err: unknown) {
  const raw = err instanceof Error ? err.message : '';
  const code = publicCodes.has(raw) ? raw : 'REQUEST_FAILED';
  const message = code === 'REQUEST_FAILED' ? 'Request could not be completed.' : raw;
  return fail(message, errorStatus(err), code);
}

const bucket = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(request: NextRequest, key: string) {
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60) * 1000;
  const ip = request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const current = bucket.get(id);

  if (!current || current.resetAt <= now) {
    bucket.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}
