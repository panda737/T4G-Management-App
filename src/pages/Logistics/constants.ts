// Logistics module constants.
//
// The business does route planning + live tracking in Ctrack; the app owns the
// compliance/admin layer. CTRACK_URL is the single hand-off link to the portal.
export const CTRACK_URL = 'https://ctrackcrystal.com/';

export const VEHICLE_TYPES = [
  'Tipper',
  'Hooklift',
  'Compactor',
  'Box / Panel Van',
  'Flatbed',
  'Bakkie / LDV',
  'Trailer',
  'Other',
];

export const VEHICLE_STATUSES = ['Active', 'In for Repair', 'Decommissioned'] as const;

// Positions whose people can hold a driver-compliance record.
export const DRIVER_POSITIONS = ['Truck Driver', 'Handler', 'Logistics Manager'];
