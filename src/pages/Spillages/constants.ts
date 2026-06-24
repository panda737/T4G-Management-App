// The third-party client whose waste the spillage belongs to. Fixed list —
// our team reports the spill against one of these clients.
export const SPILLAGE_PARTIES = [
  'Tshenolo',
  'Phuting',
  'Pleasant Waste',
  'Umndeni Waste',
  'Switch Waste',
  'Tech4Green',
] as const;

// What was found. "Other" lets them describe anything not listed.
export const SPILLAGE_TYPES = [
  'Loose waste in wheelie bin',
  'Blood in wheelie bin',
  'Sharps in wheelie bin',
  'Blood spilt on floor',
  'Other',
] as const;

export const SPILLAGE_PHOTO_BUCKET = 'spillage-photos';
export const SPILLAGE_PHOTO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const SPILLAGE_PHOTO_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
