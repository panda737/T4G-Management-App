import { PLANT_STEPS, STEP_COLORS } from '../data/plantEquipment';

const STATUS_FILLS: Record<string, string> = {
  Operational: '#22c55e',
  'Under Maintenance': '#eab308',
  Faulty: '#ef4444',
  Decommissioned: '#9ca3af',
};

interface Props {
  selectedKey: string | null;
  statusMap: Record<string, string>;
  lowPartsMap: Record<string, number>;
  onSelect: (key: string) => void;
}

const STEEL = '#b0bec5';
const STEEL_DARK = '#78909c';
const STEEL_LIGHT = '#cfd8dc';
const MOTOR_BLUE = '#1565c0';
const MOTOR_BLUE_LIGHT = '#42a5f5';
const FRAME_GRAY = '#607d8b';
const BASE_DARK = '#455a64';
const BASE_LIGHT = '#546e7a';

export default function PlantDiagram({ selectedKey, statusMap, lowPartsMap, onSelect }: Props) {
  return (
    <svg
      viewBox="0 0 1200 500"
      className="w-full h-full"
      style={{ minHeight: 340 }}
    >
      <defs>
        <linearGradient id="basePlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BASE_LIGHT} />
          <stop offset="100%" stopColor={BASE_DARK} />
        </linearGradient>
        <linearGradient id="steelBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={STEEL_LIGHT} />
          <stop offset="100%" stopColor={STEEL} />
        </linearGradient>
        <linearGradient id="tankBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0e0e0" />
          <stop offset="60%" stopColor={STEEL} />
          <stop offset="100%" stopColor={STEEL_DARK} />
        </linearGradient>
        <linearGradient id="motorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MOTOR_BLUE_LIGHT} />
          <stop offset="100%" stopColor={MOTOR_BLUE} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={STEEL_DARK} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
      </defs>

      {/* Base platform */}
      <rect x="30" y="410" width="1140" height="28" rx="3" fill="url(#basePlate)" />
      <rect x="30" y="410" width="1140" height="4" rx="2" fill={BASE_LIGHT} opacity="0.5" />

      {/* Flow arrows */}
      <FlowArrows />

      {/* Equipment groups - right to left: Shredder(1), Auger1(2), HoldingTank(3), Auger2(4), SterilizingTank(5), Dryer(6), Worstopper(7), Outlet(8) */}
      <EquipmentGroup stepKey="outlet_conveyor" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <OutletConveyor />
      </EquipmentGroup>

      <EquipmentGroup stepKey="worstopper" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <Worstopper />
      </EquipmentGroup>

      <EquipmentGroup stepKey="incline_dryer" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <InclineDryer />
      </EquipmentGroup>

      <EquipmentGroup stepKey="sterilizing_tank" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <SterilizingTank />
      </EquipmentGroup>

      <EquipmentGroup stepKey="incline_auger_2" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <InclineAuger2 />
      </EquipmentGroup>

      <EquipmentGroup stepKey="holding_tank" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <HoldingTank />
      </EquipmentGroup>

      <EquipmentGroup stepKey="incline_auger_1" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <InclineAuger1 />
      </EquipmentGroup>

      <EquipmentGroup stepKey="shredder" selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={onSelect}>
        <Shredder />
      </EquipmentGroup>

      {/* Step labels */}
      <StepLabels selectedKey={selectedKey} />
    </svg>
  );
}

function EquipmentGroup({ stepKey, selectedKey, statusMap, lowPartsMap, onSelect, children }: {
  stepKey: string;
  selectedKey: string | null;
  statusMap: Record<string, string>;
  lowPartsMap: Record<string, number>;
  onSelect: (key: string) => void;
  children: React.ReactNode;
}) {
  const isSelected = selectedKey === stepKey;
  const status = statusMap[stepKey] || 'Operational';
  const statusColor = STATUS_FILLS[status] || STATUS_FILLS.Operational;
  const lowParts = lowPartsMap[stepKey] || 0;
  const pos = EQUIPMENT_POSITIONS[stepKey];
  if (!pos) return null;

  return (
    <g
      onClick={() => onSelect(stepKey)}
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s, opacity 0.2s' }}
      opacity={selectedKey && !isSelected ? 0.45 : 1}
    >
      {isSelected && (
        <rect
          x={pos.x - 8}
          y={pos.y - 8}
          width={pos.w + 16}
          height={pos.h + 16}
          rx="8"
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          filter="url(#glow)"
          className="animate-pulse"
        />
      )}
      {children}
      {/* Status dot */}
      <circle cx={pos.x + pos.w - 4} cy={pos.y + 8} r="5" fill={statusColor} stroke="white" strokeWidth="1.5" />
      {/* Low parts badge */}
      {lowParts > 0 && (
        <g>
          <circle cx={pos.x + pos.w + 2} cy={pos.y - 2} r="8" fill="#ef4444" />
          <text x={pos.x + pos.w + 2} y={pos.y + 2} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{lowParts}</text>
        </g>
      )}
    </g>
  );
}

const EQUIPMENT_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  shredder:         { x: 1040, y: 200, w: 120, h: 210 },
  incline_auger_1:  { x: 920,  y: 170, w: 100, h: 240 },
  holding_tank:     { x: 730,  y: 130, w: 140, h: 280 },
  incline_auger_2:  { x: 620,  y: 170, w: 100, h: 240 },
  sterilizing_tank: { x: 430,  y: 150, w: 140, h: 260 },
  incline_dryer:    { x: 310,  y: 170, w: 100, h: 240 },
  worstopper:       { x: 190,  y: 240, w: 100, h: 170 },
  outlet_conveyor:  { x: 50,   y: 340, w: 140, h: 70 },
};

function Shredder() {
  const x = 1050, y = 220;
  return (
    <g>
      {/* Feed hopper top */}
      <polygon points={`${x+10},${y-10} ${x+90},${y-10} ${x+100},${y+20} ${x},${y+20}`} fill={STEEL_DARK} stroke={STEEL_DARK} strokeWidth="1" />
      <polygon points={`${x+20},${y-30} ${x+80},${y-30} ${x+90},${y-10} ${x+10},${y-10}`} fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Main body */}
      <rect x={x} y={y+20} width="100" height="120" rx="3" fill="url(#steelBody)" stroke={STEEL_DARK} strokeWidth="1" />
      <rect x={x} y={y+20} width="100" height="120" rx="3" fill="url(#hatch)" />
      {/* Cutting chamber lines */}
      <line x1={x+15} y1={y+50} x2={x+85} y2={y+50} stroke={STEEL_DARK} strokeWidth="1" strokeDasharray="4 2" />
      <line x1={x+15} y1={y+80} x2={x+85} y2={y+80} stroke={STEEL_DARK} strokeWidth="1" strokeDasharray="4 2" />
      {/* Twin shaft indicators */}
      <circle cx={x+35} cy={y+65} r="10" fill="none" stroke={FRAME_GRAY} strokeWidth="1.5" />
      <circle cx={x+65} cy={y+65} r="10" fill="none" stroke={FRAME_GRAY} strokeWidth="1.5" />
      <circle cx={x+35} cy={y+65} r="3" fill={FRAME_GRAY} />
      <circle cx={x+65} cy={y+65} r="3" fill={FRAME_GRAY} />
      {/* Drive motor */}
      <rect x={x+75} y={y+100} width="35" height="22" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <rect x={x+110} y={y+105} width="8" height="12" rx="2" fill={MOTOR_BLUE} />
      {/* Gearbox */}
      <rect x={x+60} y={y+105} width="18" height="16" rx="2" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Outlet chute */}
      <rect x={x-10} y={y+120} width="20" height="20" rx="2" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Support legs */}
      <rect x={x+5} y={y+140} width="8" height="50" fill={FRAME_GRAY} />
      <rect x={x+87} y={y+140} width="8" height="50" fill={FRAME_GRAY} />
      <rect x={x} y={y+185} width="100" height="5" rx="1" fill={FRAME_GRAY} />
    </g>
  );
}

function InclineAuger1() {
  const bx = 930, by = 390;
  const tx = 870, ty = 190;
  return (
    <g>
      {/* Trough body - angled */}
      <polygon
        points={`${bx},${by} ${bx+30},${by} ${tx+30},${ty} ${tx},${ty}`}
        fill="url(#steelBody)"
        stroke={STEEL_DARK}
        strokeWidth="1"
      />
      {/* Screw flight lines */}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => {
        const lx1 = bx + (tx - bx) * t;
        const ly1 = by + (ty - by) * t;
        const lx2 = bx + 30 + (tx + 30 - bx - 30) * t;
        const ly2 = by + (ty - by) * t;
        return <line key={i} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={STEEL_DARK} strokeWidth="0.8" opacity="0.5" />;
      })}
      {/* Lower inlet boot */}
      <rect x={bx-5} y={by-15} width="40" height="25" rx="2" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Top drive motor */}
      <rect x={tx-5} y={ty-20} width="28" height="18" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <rect x={tx+23} y={ty-16} width="7" height="10" rx="1" fill={MOTOR_BLUE} />
      {/* Discharge chute */}
      <rect x={tx+5} y={ty} width="20" height="12" rx="1" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Support frame */}
      <line x1={bx+15} y1={by} x2={(bx+tx)/2+15} y2={(by+ty)/2+20} stroke={FRAME_GRAY} strokeWidth="2" />
      <line x1={bx+15} y1={by} x2={bx+15} y2={by+20} stroke={FRAME_GRAY} strokeWidth="2" />
    </g>
  );
}

function HoldingTank() {
  const cx = 800, cy = 200, rw = 60, rh = 80;
  return (
    <g>
      {/* Leg frame */}
      <line x1={cx-45} y1={cy+rh+30} x2={cx-45} y2={cy+rh+120} stroke={FRAME_GRAY} strokeWidth="3" />
      <line x1={cx+45} y1={cy+rh+30} x2={cx+45} y2={cy+rh+120} stroke={FRAME_GRAY} strokeWidth="3" />
      <line x1={cx-30} y1={cy+rh+50} x2={cx-30} y2={cy+rh+120} stroke={FRAME_GRAY} strokeWidth="2" />
      <line x1={cx+30} y1={cy+rh+50} x2={cx+30} y2={cy+rh+120} stroke={FRAME_GRAY} strokeWidth="2" />
      {/* Cross braces */}
      <line x1={cx-45} y1={cy+rh+60} x2={cx+45} y2={cy+rh+100} stroke={FRAME_GRAY} strokeWidth="1.5" />
      <line x1={cx+45} y1={cy+rh+60} x2={cx-45} y2={cy+rh+100} stroke={FRAME_GRAY} strokeWidth="1.5" />
      {/* Foot plates */}
      <rect x={cx-52} y={cy+rh+118} width="14" height="4" rx="1" fill={FRAME_GRAY} />
      <rect x={cx+38} y={cy+rh+118} width="14" height="4" rx="1" fill={FRAME_GRAY} />
      {/* Cylindrical vessel */}
      <ellipse cx={cx} cy={cy} rx={rw} ry="14" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="1" />
      <rect x={cx-rw} y={cy} width={rw*2} height={rh} fill="url(#tankBody)" stroke={STEEL_DARK} strokeWidth="1" />
      <ellipse cx={cx} cy={cy+rh} rx={rw} ry="14" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Cone bottom */}
      <polygon points={`${cx-rw},${cy+rh-2} ${cx+rw},${cy+rh-2} ${cx+8},${cy+rh+35} ${cx-8},${cy+rh+35}`} fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Discharge gate */}
      <rect x={cx-6} y={cy+rh+33} width="12" height="8" rx="1" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Inspection ports */}
      <circle cx={cx-25} cy={cy+35} r="6" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="1" />
      <circle cx={cx-25} cy={cy+35} r="3" fill="white" fillOpacity="0.3" />
      {/* Agitator motor on top */}
      <rect x={cx-12} y={cy-35} width="24" height="22" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <line x1={cx} y1={cy-13} x2={cx} y2={cy+rh+10} stroke={STEEL_DARK} strokeWidth="1.5" strokeDasharray="3 4" />
      {/* Agitator paddles */}
      <line x1={cx-18} y1={cy+30} x2={cx+18} y2={cy+30} stroke={STEEL_DARK} strokeWidth="2" />
      <line x1={cx-15} y1={cy+55} x2={cx+15} y2={cy+55} stroke={STEEL_DARK} strokeWidth="2" />
      {/* Top lid detail */}
      <ellipse cx={cx} cy={cy} rx={rw-4} ry="10" fill="none" stroke={STEEL_DARK} strokeWidth="0.5" strokeDasharray="3 2" />
    </g>
  );
}

function InclineAuger2() {
  const bx = 640, by = 390;
  const tx = 580, ty = 190;
  return (
    <g>
      {/* Trough body */}
      <polygon
        points={`${bx},${by} ${bx+30},${by} ${tx+30},${ty} ${tx},${ty}`}
        fill="url(#steelBody)"
        stroke={STEEL_DARK}
        strokeWidth="1"
      />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => {
        const lx1 = bx + (tx - bx) * t;
        const ly1 = by + (ty - by) * t;
        const lx2 = bx + 30 + (tx + 30 - bx - 30) * t;
        const ly2 = by + (ty - by) * t;
        return <line key={i} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={STEEL_DARK} strokeWidth="0.8" opacity="0.5" />;
      })}
      {/* Lower inlet boot */}
      <rect x={bx-5} y={by-15} width="40" height="25" rx="2" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Top drive motor */}
      <rect x={tx-5} y={ty-20} width="28" height="18" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <rect x={tx+23} y={ty-16} width="7" height="10" rx="1" fill={MOTOR_BLUE} />
      {/* Discharge chute */}
      <rect x={tx+5} y={ty} width="20" height="12" rx="1" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Support */}
      <line x1={bx+15} y1={by} x2={(bx+tx)/2+15} y2={(by+ty)/2+20} stroke={FRAME_GRAY} strokeWidth="2" />
      <line x1={bx+15} y1={by} x2={bx+15} y2={by+20} stroke={FRAME_GRAY} strokeWidth="2" />
      {/* Access covers */}
      <rect x={(bx+tx)/2-2} y={(by+ty)/2-5} width="20" height="10" rx="1" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="0.5" />
    </g>
  );
}

function SterilizingTank() {
  const cx = 500, cy = 210, rw = 55, rh = 75;
  return (
    <g>
      {/* Leg frame */}
      <line x1={cx-42} y1={cy+rh+25} x2={cx-42} y2={cy+rh+110} stroke={FRAME_GRAY} strokeWidth="3" />
      <line x1={cx+42} y1={cy+rh+25} x2={cx+42} y2={cy+rh+110} stroke={FRAME_GRAY} strokeWidth="3" />
      <line x1={cx-28} y1={cy+rh+40} x2={cx-28} y2={cy+rh+110} stroke={FRAME_GRAY} strokeWidth="2" />
      <line x1={cx+28} y1={cy+rh+40} x2={cx+28} y2={cy+rh+110} stroke={FRAME_GRAY} strokeWidth="2" />
      {/* Cross braces */}
      <line x1={cx-42} y1={cy+rh+55} x2={cx+42} y2={cy+rh+90} stroke={FRAME_GRAY} strokeWidth="1.5" />
      <line x1={cx+42} y1={cy+rh+55} x2={cx-42} y2={cy+rh+90} stroke={FRAME_GRAY} strokeWidth="1.5" />
      {/* Foot plates */}
      <rect x={cx-49} y={cy+rh+108} width="14" height="4" rx="1" fill={FRAME_GRAY} />
      <rect x={cx+35} y={cy+rh+108} width="14" height="4" rx="1" fill={FRAME_GRAY} />
      {/* Vessel */}
      <ellipse cx={cx} cy={cy} rx={rw} ry="12" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="1" />
      <rect x={cx-rw} y={cy} width={rw*2} height={rh} fill="url(#tankBody)" stroke={STEEL_DARK} strokeWidth="1" />
      <ellipse cx={cx} cy={cy+rh} rx={rw} ry="12" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Cone bottom */}
      <polygon points={`${cx-rw},${cy+rh-2} ${cx+rw},${cy+rh-2} ${cx+8},${cy+rh+30} ${cx-8},${cy+rh+30}`} fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Outlet transition */}
      <rect x={cx-6} y={cy+rh+28} width="12" height="8" rx="1" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Steam/heat ports */}
      <circle cx={cx+30} cy={cy+25} r="5" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="0.8" />
      <circle cx={cx+30} cy={cy+50} r="5" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="0.8" />
      {/* Agitator motor */}
      <rect x={cx-12} y={cy-32} width="24" height="20" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <line x1={cx} y1={cy-12} x2={cx} y2={cy+rh+5} stroke={STEEL_DARK} strokeWidth="1.5" strokeDasharray="3 4" />
      {/* Agitator blade */}
      <line x1={cx-16} y1={cy+35} x2={cx+16} y2={cy+35} stroke={STEEL_DARK} strokeWidth="2" />
      <line x1={cx-12} y1={cy+55} x2={cx+12} y2={cy+55} stroke={STEEL_DARK} strokeWidth="2" />
      {/* Lid ring */}
      <ellipse cx={cx} cy={cy} rx={rw-4} ry="8" fill="none" stroke={STEEL_DARK} strokeWidth="0.5" strokeDasharray="3 2" />
    </g>
  );
}

function InclineDryer() {
  const bx = 330, by = 390;
  const tx = 270, ty = 200;
  return (
    <g>
      {/* Tube body */}
      <polygon
        points={`${bx},${by} ${bx+35},${by} ${tx+35},${ty} ${tx},${ty}`}
        fill="url(#steelBody)"
        stroke={STEEL_DARK}
        strokeWidth="1"
      />
      {/* Paddle flight lines */}
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t, i) => {
        const lx1 = bx + (tx - bx) * t;
        const ly1 = by + (ty - by) * t;
        const lx2 = bx + 35 + (tx + 35 - bx - 35) * t;
        const ly2 = by + (ty - by) * t;
        return <line key={i} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={STEEL_DARK} strokeWidth="0.7" opacity="0.4" />;
      })}
      {/* Lower inlet */}
      <rect x={bx-5} y={by-12} width="45" height="22" rx="2" fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Drive motor at top */}
      <rect x={tx-5} y={ty-22} width="30" height="20" rx="3" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      <rect x={tx+25} y={ty-17} width="8" height="10" rx="1" fill={MOTOR_BLUE} />
      {/* Upper discharge */}
      <rect x={tx+8} y={ty+2} width="18" height="14" rx="1" fill={STEEL_DARK} stroke={FRAME_GRAY} strokeWidth="0.5" />
      {/* Support frame */}
      <line x1={bx+17} y1={by} x2={(bx+tx)/2+17} y2={(by+ty)/2+20} stroke={FRAME_GRAY} strokeWidth="2" />
      <line x1={bx+17} y1={by} x2={bx+17} y2={by+20} stroke={FRAME_GRAY} strokeWidth="2" />
    </g>
  );
}

function Worstopper() {
  const x = 200, y = 260;
  return (
    <g>
      {/* Receiving hopper */}
      <polygon points={`${x-5},${y} ${x+55},${y} ${x+50},${y+30} ${x},${y+30}`} fill={STEEL} stroke={STEEL_DARK} strokeWidth="1" />
      <polygon points={`${x+5},${y-15} ${x+45},${y-15} ${x+55},${y} ${x-5},${y}`} fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="1" />
      {/* Outlet screw body */}
      <rect x={x-5} y={y+30} width="60" height="35" rx="3" fill="url(#steelBody)" stroke={STEEL_DARK} strokeWidth="1" />
      <rect x={x-5} y={y+30} width="60" height="35" rx="3" fill="url(#hatch)" />
      {/* Drive motor */}
      <rect x={x+40} y={y+35} width="22" height="16" rx="2" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      {/* Curved discharge */}
      <path d={`M${x-5},${y+45} Q${x-25},${y+45} ${x-25},${y+65}`} fill="none" stroke={STEEL_DARK} strokeWidth="4" />
      <path d={`M${x-5},${y+50} Q${x-20},${y+50} ${x-20},${y+65}`} fill="none" stroke={STEEL} strokeWidth="3" />
      {/* Mounting base */}
      <rect x={x-10} y={y+65} width="70" height="6" rx="1" fill={FRAME_GRAY} />
      {/* Support legs */}
      <rect x={x} y={y+71} width="6" height="42" fill={FRAME_GRAY} />
      <rect x={x+44} y={y+71} width="6" height="42" fill={FRAME_GRAY} />
      <rect x={x-8} y={y+110} width="66" height="4" rx="1" fill={FRAME_GRAY} />
    </g>
  );
}

function OutletConveyor() {
  const x = 60, y = 350;
  return (
    <g>
      {/* Discharge tube */}
      <rect x={x} y={y+10} width="120" height="22" rx="4" fill="url(#steelBody)" stroke={STEEL_DARK} strokeWidth="1" />
      {/* Internal screw hint */}
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t, i) => (
        <line key={i} x1={x + 120*t} y1={y+12} x2={x + 120*t} y2={y+30} stroke={STEEL_DARK} strokeWidth="0.5" opacity="0.3" />
      ))}
      {/* Outlet elbow */}
      <path d={`M${x},${y+15} Q${x-15},${y+15} ${x-15},${y+35}`} fill="none" stroke={STEEL_DARK} strokeWidth="5" />
      <path d={`M${x+2},${y+18} Q${x-10},${y+18} ${x-10},${y+35}`} fill="none" stroke={STEEL} strokeWidth="3" />
      {/* Drive assembly */}
      <rect x={x+100} y={y+2} width="22" height="15" rx="2" fill="url(#motorGrad)" stroke={MOTOR_BLUE} strokeWidth="0.5" />
      {/* Support feet */}
      <rect x={x+10} y={y+32} width="6" height="22" fill={FRAME_GRAY} />
      <rect x={x+100} y={y+32} width="6" height="22" fill={FRAME_GRAY} />
      <rect x={x+5} y={y+52} width="106" height="4" rx="1" fill={FRAME_GRAY} />
      {/* Collection point indicator */}
      <rect x={x-20} y={y+35} width="14" height="20" rx="2" fill={STEEL_LIGHT} stroke={STEEL_DARK} strokeWidth="0.5" />
    </g>
  );
}

function FlowArrows() {
  const arrows: { x1: number; y1: number; x2: number; y2: number }[] = [
    { x1: 1040, y1: 340, x2: 965, y2: 340 },
    { x1: 920, y1: 220, x2: 870, y2: 220 },
    { x1: 730, y1: 340, x2: 675, y2: 340 },
    { x1: 620, y1: 220, x2: 570, y2: 220 },
    { x1: 430, y1: 340, x2: 375, y2: 340 },
    { x1: 310, y1: 240, x2: 265, y2: 270 },
    { x1: 195, y1: 380, x2: 180, y2: 380 },
  ];

  return (
    <g>
      {arrows.map((a, i) => (
        <g key={i}>
          <line x1={a.x1} y1={a.y1} x2={a.x2+8} y2={a.y2} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
          <polygon
            points={`${a.x2},${a.y2} ${a.x2+8},${a.y2-4} ${a.x2+8},${a.y2+4}`}
            fill="#94a3b8"
          />
        </g>
      ))}
    </g>
  );
}

function StepLabels({ selectedKey }: { selectedKey: string | null }) {
  const labels: { key: string; x: number; y: number }[] = [
    { key: 'shredder',         x: 1100, y: 200 },
    { key: 'incline_auger_1',  x: 950,  y: 168 },
    { key: 'holding_tank',     x: 800,  y: 150 },
    { key: 'incline_auger_2',  x: 655,  y: 168 },
    { key: 'sterilizing_tank', x: 500,  y: 168 },
    { key: 'incline_dryer',    x: 345,  y: 178 },
    { key: 'worstopper',       x: 230,  y: 238 },
    { key: 'outlet_conveyor',  x: 115,  y: 340 },
  ];

  return (
    <g>
      {labels.map(l => {
        const step = PLANT_STEPS.find(s => s.key === l.key);
        if (!step) return null;
        const isSelected = selectedKey === l.key;
        const color = STEP_COLORS[l.key];
        return (
          <g key={l.key}>
            {/* Step number badge */}
            <circle cx={l.x - 20} cy={l.y - 15} r="9" fill={isSelected ? color : '#e2e8f0'} />
            <text x={l.x - 20} y={l.y - 11} textAnchor="middle" fill={isSelected ? 'white' : '#64748b'} fontSize="8" fontWeight="bold">{step.step}</text>
            {/* Name */}
            <text x={l.x - 8} y={l.y - 11} fill={isSelected ? color : '#475569'} fontSize="9" fontWeight={isSelected ? 'bold' : '600'}>{step.name}</text>
          </g>
        );
      })}
    </g>
  );
}
