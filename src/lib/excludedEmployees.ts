// People hidden from the H&S people-pickers, matched case-insensitively on full
// name or first name.
//
// Toolbox-talk attendees exclude this set; the shift-report team picker excludes
// the same set plus a couple of extra names (drivers are already dropped by the
// position filter in OperatorShiftEntry).
export const TOOLBOX_EXCLUDED_NAMES = [
  'Juandre Cross', 'Waldo', 'Gerriaan', 'Leon', 'Theresa', 'Nicolene', 'Dineo', 'Linokuhle', 'Corne',
];

export const SHIFT_TEAM_EXCLUDED_NAMES = [
  ...TOOLBOX_EXCLUDED_NAMES, 'Hugo', 'Siyanda',
];
