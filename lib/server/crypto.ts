import crypto from 'node:crypto';

function key() {
  const value = process.env.INVENTORY_ENCRYPTION_KEY_BASE64;
  if (!value) throw new Error('INVENTORY_ENCRYPTION_KEY_BASE64 is required.');
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length !== 32) throw new Error('Inventory encryption key must decode to 32 bytes.');
  return buffer;
}

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(encoded: string) {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
