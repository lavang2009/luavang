export const BRAND = 'Lù A Vang';
export const CATEGORIES = ['acc', 'file'] as const;
export type Category = typeof CATEGORIES[number];
export const ORDER_STATUSES = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded'] as const;
export const DEPOSIT_STATUSES = ['pending', 'processing', 'success', 'expired', 'failed', 'rejected'] as const;
export const CARD_STATUSES = ['pending', 'processing', 'success', 'failed', 'rejected'] as const;
