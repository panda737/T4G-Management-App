export const POSITIONS = [
  'Truck Driver', 'Handler', 'General Worker', 'Senior Operator', 'Xray Operator',
  'Supervisor', 'Maintenance', 'Receiving Officer', 'Stock Controller',
  'Logistics Manager', 'Operations Manager', 'General Manager', 'Commercial Director',
  'Admin Manager', 'Admin Staff', 'Health & Safety Officer',
];

export const DEPARTMENTS = ['Production', 'Logistics', 'Maintenance', 'Admin'] as const;

// Positions that map to specific departments; everything else is Production.
const LOGISTICS_POSITIONS = ['Truck Driver', 'Handler', 'Logistics Manager', 'Stock Controller'];
const ADMIN_POSITIONS = ['Admin Manager', 'Admin Staff', 'Health & Safety Officer', 'Operations Manager', 'General Manager', 'Commercial Director'];
const MAINTENANCE_POSITIONS = ['Maintenance'];

/**
 * Department is 100% derived from position — never hand-set. Used both on save
 * (to keep the stored `employees.department` in sync) and on display.
 */
export function departmentForPosition(position: string): string {
  if (LOGISTICS_POSITIONS.includes(position)) return 'Logistics';
  if (ADMIN_POSITIONS.includes(position)) return 'Admin';
  if (MAINTENANCE_POSITIONS.includes(position)) return 'Maintenance';
  return 'Production';
}
