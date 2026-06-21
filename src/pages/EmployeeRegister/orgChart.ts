import { departmentForPosition } from './constants';

export type OrgEmployee = {
  id: string;
  first_name: string;
  surname: string;
  position: string;
};

/**
 * The org structure, defined purely by POSITION (people slot in via their
 * `position`). Each entry maps a position to the position it reports to
 * (null = top of the org). Single source of truth for the Organogram.
 */
export const ORG_REPORTS_TO: Record<string, string | null> = {
  'Managing Director': null,
  'Operations Manager': 'Managing Director',
  'Commercial Director': 'Managing Director',
  'Admin Manager': 'Commercial Director',
  'Admin Staff': 'Admin Manager',
  'Logistics Manager': 'Operations Manager',
  'Truck Driver': 'Logistics Manager',
  'Handler': 'Logistics Manager',
  'Stock Controller': 'Operations Manager',
  'Maintenance': 'Operations Manager',
  'Receiving Officer': 'Admin Manager',
  'Health & Safety Officer': 'Operations Manager',
  // Shift pool — all report to the Operations Manager and render as ONE block.
  'Supervisor': 'Operations Manager',
  'Senior Operator': 'Operations Manager',
  'Xray Operator': 'Operations Manager',
  'General Worker': 'Operations Manager',
};

/**
 * The production shift workforce — one rotating pool under the Operations
 * Manager, shown in this seniority order (supervisors rotate with the team).
 */
export const SHIFT_POOL = ['Supervisor', 'Senior Operator', 'Xray Operator', 'General Worker'];

export type OrgTier = { position: string; people: OrgEmployee[] };

export type OrgNode = {
  kind: 'role' | 'shiftpool';
  /** Role title, or 'Shift Workforce' for the pool node. */
  title: string;
  department: string;
  people: OrgEmployee[];          // role nodes
  tiers?: OrgTier[];              // shiftpool node only
  children: OrgNode[];
};

const SHIFT_SET = new Set(SHIFT_POOL);
const bySurname = (a: OrgEmployee, b: OrgEmployee) => a.surname.localeCompare(b.surname);

/**
 * Builds the org tree from the active employees, attaching each person to their
 * position node. Vacant positions (no one holding them) still render. The shift
 * positions collapse into a single "Shift Workforce" pool node under the
 * Operations Manager.
 */
export function buildOrgTree(employees: OrgEmployee[]): OrgNode | null {
  const byPosition = new Map<string, OrgEmployee[]>();
  for (const e of employees) {
    const list = byPosition.get(e.position) ?? [];
    list.push(e);
    byPosition.set(e.position, list);
  }
  const peopleFor = (position: string) => (byPosition.get(position) ?? []).slice().sort(bySurname);

  const allPositions = Object.keys(ORG_REPORTS_TO);

  const makeNode = (position: string): OrgNode => {
    const childPositions = allPositions.filter(
      p => ORG_REPORTS_TO[p] === position && !SHIFT_SET.has(p),
    );
    const children = childPositions.map(makeNode);

    // The Operations Manager carries the shift workforce pool as its first child.
    if (position === 'Operations Manager') {
      const shiftNode: OrgNode = {
        kind: 'shiftpool',
        title: 'Shift Workforce',
        department: 'Production',
        people: [],
        tiers: SHIFT_POOL.map(p => ({ position: p, people: peopleFor(p) })),
        children: [],
      };
      children.unshift(shiftNode);
    }

    return {
      kind: 'role',
      title: position,
      department: departmentForPosition(position),
      people: peopleFor(position),
      children,
    };
  };

  const root = allPositions.find(p => ORG_REPORTS_TO[p] === null);
  return root ? makeNode(root) : null;
}
