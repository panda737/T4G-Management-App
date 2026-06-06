export interface PlantStep {
  key: string;
  step: number;
  name: string;
  description: string;
  mainParts: string[];
  spareParts: string[];
}

export const PLANT_STEPS: PlantStep[] = [
  {
    key: 'shredder',
    step: 1,
    name: 'Shredder',
    description: 'Far-right feed station where medical waste is loaded and shredded before transfer.',
    mainParts: ['Feed hopper', 'Cutting chamber', 'Twin shaft cutter pack', 'Drive motor', 'Gearbox', 'Outlet chute'],
    spareParts: ['Cutter blades', 'Shaft seals', 'Drive belts', 'Gearbox oil', 'Motor coupling', 'Bearing set'],
  },
  {
    key: 'incline_auger_1',
    step: 2,
    name: 'Incline Auger 1',
    description: 'Transfers shredded waste from the shredder upward and drops it into the holding tank.',
    mainParts: ['Inclined trough', 'Screw flight', 'Top drive motor', 'Lower inlet boot', 'Discharge chute', 'Support frame'],
    spareParts: ['Screw flight section', 'End bearings', 'Motor fan cover', 'Gear reducer', 'Shaft seal', 'Inspection cover gasket'],
  },
  {
    key: 'holding_tank',
    step: 3,
    name: 'Holding Tank',
    description: 'Receives waste from Auger 1 and buffers material before feeding Auger 2.',
    mainParts: ['Cylindrical vessel', 'Top agitator motor', 'Inspection ports', 'Cone bottom', 'Discharge gate', 'Leg frame'],
    spareParts: ['Agitator paddles', 'Lid gasket', 'Sight glass', 'Level sensor', 'Discharge valve', 'Frame foot plates'],
  },
  {
    key: 'incline_auger_2',
    step: 4,
    name: 'Incline Auger 2',
    description: 'Transfers waste from the holding tank upward and drops it into the sterilizing tank.',
    mainParts: ['Inclined trough', 'Screw flight', 'Top drive motor', 'Lower inlet boot', 'Discharge chute', 'Access covers'],
    spareParts: ['Screw flight section', 'End bearings', 'Shaft seal', 'Gear reducer', 'Fastener kit', 'Cover gaskets'],
  },
  {
    key: 'sterilizing_tank',
    step: 5,
    name: 'Sterilizing Tank',
    description: 'Main treatment vessel where waste is sterilized before drying.',
    mainParts: ['Treatment vessel', 'Agitator shaft', 'Top drive', 'Steam or heat ports', 'Cone bottom', 'Outlet transition'],
    spareParts: ['Agitator seals', 'Temperature probe', 'Lid gasket', 'Spray nozzle', 'Outlet valve', 'Bearing set'],
  },
  {
    key: 'incline_dryer',
    step: 6,
    name: 'Incline Dryer',
    description: 'Receives sterilized material, dries/transfers it upward, and drops it into the Worstopper.',
    mainParts: ['Inclined dryer tube', 'Screw or paddle flight', 'Drive motor', 'Lower inlet', 'Upper discharge', 'Support frame'],
    spareParts: ['Paddle flight', 'End bearings', 'Shaft seal', 'Drive coupling', 'Heater sensor', 'Access cover gasket'],
  },
  {
    key: 'worstopper',
    step: 7,
    name: 'Worstopper',
    description: 'Receives dried treated output from the Incline Dryer and feeds the final outlet conveyor.',
    mainParts: ['Receiving hopper', 'Outlet screw', 'Curved discharge', 'Drive motor', 'Mounting base', 'Transition chute'],
    spareParts: ['Outlet screw', 'Drive motor', 'Shaft bearings', 'Seal kit', 'Discharge elbow', 'Mounting bolts'],
  },
  {
    key: 'outlet_conveyor',
    step: 8,
    name: 'Outlet Conveyor',
    description: 'Final conveyor that moves treated material away from the Worstopper for collection.',
    mainParts: ['Discharge tube', 'Outlet elbow', 'Support foot', 'Drive assembly', 'Base plate', 'Collection point'],
    spareParts: ['Conveyor screw', 'Outlet elbow', 'End bearing', 'Drive coupling', 'Support bracket', 'Seal kit'],
  },
];

export const STEP_COLORS: Record<string, string> = {
  shredder: '#ef4444',
  incline_auger_1: '#f97316',
  holding_tank: '#06b6d4',
  incline_auger_2: '#3b82f6',
  sterilizing_tank: '#8b5cf6',
  incline_dryer: '#14b8a6',
  worstopper: '#ec4899',
  outlet_conveyor: '#64748b',
};
