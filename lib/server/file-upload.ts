import path from 'node:path';

export const MAX_FILE_SIZE = 500 * 1024 * 1024;

const allowedTypes = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/octet-stream',
  'application/json',
  'application/7z',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'text/csv',
  'application/x-apple-aspen-config',
  'application/vnd.android.package-archive',
]);

const allowedExtensions = new Set([
  '.pdf', '.zip', '.txt', '.json', '.7z', '.rar',
  '.ipa', '.apk', '.mobileconfig', '.csv',
]);

export function sanitizeFileName(name: string) {
  const raw = path.basename(name).trim();
  const ext = path.extname(raw).toLowerCase();
  const base = path.basename(raw, path.extname(raw))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  return {
    name: `${base || 'file'}${ext}`,
    extension: ext,
    contentType: ext === '.pdf' ? 'application/pdf' : undefined,
  };
}

export function isAllowedFile(name: string, contentType: string) {
  const ext = path.extname(name).toLowerCase();
  return allowedExtensions.has(ext) && (!contentType || allowedTypes.has(contentType));
}

export function isSafeContentType(contentType: string) {
  return !contentType ||
    /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(contentType);
}
