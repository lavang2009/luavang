export function money(amount: number) { return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND', maximumFractionDigits:0 }).format(amount); }
export function dateTime(value: unknown) {
  if (value && typeof value === 'object' && '_seconds' in value) { const seconds = Number((value as { _seconds:number })._seconds); return new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(seconds*1000)); }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle:'medium', timeStyle:'short' }).format(date);
}
export function slugify(input: string) { return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
export function safeImageUrl(url: string) { try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.toString() : ''; } catch { return ''; } }
export function randomCode(prefix = 'LV') { return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random()*8999+1000)}`; }

export function firestoreMillis(value: unknown) { if (value && typeof value === 'object' && 'toDate' in value && typeof (value as {toDate:()=>Date}).toDate === 'function') return (value as {toDate:()=>Date}).toDate().getTime(); return value instanceof Date ? value.getTime() : 0; }

export function isoDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
