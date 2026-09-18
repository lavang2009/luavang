import crypto from 'node:crypto';

const endpoint = () => process.env.NAPPAY_ENDPOINT || 'https://nappay.vn/chargingws/v2';

function md5(s: string) {
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

export type CardInput = {
  requestId: string;
  telco: string;
  amount: number;
  serial: string;
  code: string;
};

export type NappayResponse = {
  trans_id?: number | string;
  request_id?: string;
  amount?: number | string;
  value?: number | string;
  declared_value?: number | string;
  telco?: string;
  serial?: string;
  code?: string;
  status?: number | string;
  callback_sign?: string;
  message?: string;
};

function config() {
  const partnerId = process.env.NAPPAY_PARTNER_ID;
  const partnerKey = process.env.NAPPAY_PARTNER_KEY;
  if (!partnerId || !partnerKey) throw new Error('NAPPAY_NOT_CONFIGURED');
  return { partnerId, partnerKey };
}

async function post(payload: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) throw new Error('NAPPAY_HTTP_ERROR');
    const data = await res.json();
    return (data?.data && typeof data.data === 'object' ? data.data : data) as NappayResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyNappayResponse(response: NappayResponse, code: string, serial: string) {
  const partnerKey = process.env.NAPPAY_PARTNER_KEY;
  const provided = String(response.callback_sign || '').toLowerCase();
  if (!partnerKey || !provided) return false;

  const expected = md5(partnerKey + code + serial).toLowerCase();
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function submitCard(input: CardInput) {
  const { partnerId, partnerKey } = config();
  const sign = md5(
    partnerKey +
    input.code +
    'charging' +
    partnerId +
    input.requestId +
    input.serial +
    input.telco,
  );

  return post({
    command: 'charging',
    partner_id: partnerId,
    request_id: input.requestId,
    telco: input.telco,
    amount: String(input.amount),
    serial: input.serial,
    code: input.code,
    sign,
  });
}

export async function checkCard(requestId: string) {
  const { partnerId, partnerKey } = config();
  const command = 'check';
  const sign = md5(partnerKey + command + partnerId + requestId);

  return post({
    command,
    partner_id: partnerId,
    request_id: requestId,
    sign,
  });
}
