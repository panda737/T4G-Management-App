// Biological-indicator capture (Compliance module).
export const BI_PHOTO_BUCKET = 'biological-indicator-photos';
export const BI_PHOTO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const BI_PHOTO_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Each compactor has a number — staff pick which one the indicator belongs to.
export const COMPACTORS = [1, 2, 3, 4] as const;
