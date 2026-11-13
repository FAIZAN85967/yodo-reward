import type { ReactElement } from 'react';
import { Trophy } from 'lucide-react';
import {
  BOARD_SIZE,
  LUDO_COLORS,
  PLAYER_COLOR_IDS,
  isSafeTrackIndex,
  isStartIndex,
  laneColorAt,
  tokenPosition,
  trackIndexAt,
} from '@/components/ludo/ludoEngine';

interface LudoBoardProps {
  tokens: number[][];
  movableTokens: number[];
  movableColor: number | null;
  onTokenClick: (tokenIndex: number) => void;
}

const LINE = '#D6D3D1';
const STEP_TRANSITION = 'left 220ms linear, top 220ms linear';
const STACK_OFFSETS: readonly (readonly [number, number])[] = [
  [-0.2, -0.2],
  [0.2, -0.2],
  [-0.2, 0.2],
  [0.2, 0.2],
];

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
  }).join(' ');
}

function cellCells() {
  const cells: ReactElement[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const track = trackIndexAt(r, c);
      const lane = laneColorAt(r, c);
      if (track === undefined && lane === undefined) continue;
      let fill = '#FFFFFF';
      if (lane !== undefined) fill = LUDO_COLORS[lane].hex;
      else if (track !== undefined && isStartIndex(track)) fill = LUDO_COLORS[track / 13].hex;
      cells.push(<rect key={`cell-${r}-${c}`} x={c} y={r} width={1} height={1} fill={fill} stroke={LINE} strokeWidth={0.03} />);
      if (track !== undefined && isSafeTrackIndex(track)) {
        const isColored = isStartIndex(track);
        cells.push(
          <polygon
            key={`star-${r}-${c}`}
            points={starPoints(c + 0.5, r + 0.5, 0.36, 0.15)}
            fill={isColored ? '#FFFFFF' : '#A8A29E'}
          />
        );
      }
    }
  }
  return cells;
}

function yards() {
  return LUDO_COLORS.map(({ id, hex, base: [r, c] }) => (
    <g key={`yard-${id}`}>
      <rect x={c} y={r} width={6} height={6} rx={0.4} fill={hex} />
      <rect x={c + 0.6} y={r + 0.6} width={4.8} height={4.8} rx={0.5} fill="#FFFFFF" stroke={hex} strokeWidth={0.05} />
      {[
        [c + 1.5, r + 1.5],
        [c + 4.5, r + 1.5],
        [c + 1.5, r + 4.5],
        [c + 4.5, r + 4.5],
      ].map(([cx, cy]) => (
        <circle key={`spot-${id}-${cx}-${cy}`} cx={cx} cy={cy} r={0.5} fill={hex} fillOpacity={0.22} stroke={hex} strokeWidth={0.05} />
      ))}
    </g>
  ));
}

function centerTriangles() {
  const mid = '7.5,7.5';
  const triangles = [
    { id: 1, points: `6,6 9,6 ${mid}` },
    { id: 2, points: `9,6 9,9 ${mid}` },
    { id: 3, points: `9,9 6,9 ${mid}` },
    { id: 0, points: `6,9 6,6 ${mid}` },
  ];
  return triangles.map(({ id, points }) => (
    <polygon key={`center-${id}`} points={points} fill={LUDO_COLORS[id].hex} stroke="#FFFFFF" strokeWidth={0.04} />
  ));
}

export default function LudoBoard({ tokens, movableTokens, movableColor, onTokenClick }: LudoBoardProps) {
  const pieces = PLAYER_COLOR_IDS.flatMap((color) =>
    tokens[color].map((progress, index) => {
      const [r, c] = tokenPosition(color, index, progress);
      return { color, index, r, c, movable: color === movableColor && movableTokens.includes(index) };
    })
  );

  const cellCount = new Map<string, number>();
  const cellSeen = new Map<string, number>();
  pieces.forEach(({ r, c }) => cellCount.set(`${r},${c}`, (cellCount.get(`${r},${c}`) ?? 0) + 1));

  return (
    <div
      className="relative mx-auto aspect-square w-full overflow-hidden rounded-2xl border-[6px] border-emerald-950 bg-white shadow-2xl"
      role="group"
      aria-label="Ludo board"
    >
      <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} fill="#FFFFFF" />
        {yards()}
        {cellCells()}
        {centerTriangles()}
      </svg>

      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: '40%', top: '40%', width: '20%', height: '20%' }}
      >
        <span className="flex h-[70%] w-[70%] items-center justify-center rounded-full bg-white shadow-md">
          <Trophy className="h-[60%] w-[60%] text-gold-600" strokeWidth={2.2} />
        </span>
      </div>

      {pieces.map(({ color, index, r, c, movable }) => {
        const cellKey = `${r},${c}`;
        const total = cellCount.get(cellKey) ?? 1;
        const slot = cellSeen.get(cellKey) ?? 0;
        cellSeen.set(cellKey, slot + 1);
        const [dx, dy] = total === 1 ? [0, 0] : total === 2 ? [slot === 0 ? -0.2 : 0.2, 0] : STACK_OFFSETS[slot % 4];
        const left = ((c + 0.5 + dx) / BOARD_SIZE) * 100;
        const top = ((r + 0.5 + dy) / BOARD_SIZE) * 100;
        const { hex, name } = LUDO_COLORS[color];
        return (
          <button
            key={`${color}-${index}`}
            type="button"
            disabled={!movable}
            onClick={() => onTokenClick(index)}
            aria-label={`${name} goti ${index + 1}${movable ? ', chalne ke liye tap karein' : ''}`}
            className={`absolute z-10 aspect-square rounded-full p-0 ${movable ? 'cursor-pointer animate-glow' : 'cursor-default'}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${(100 / BOARD_SIZE) * 0.74}%`,
              transform: 'translate(-50%, -50%)',
              transition: STEP_TRANSITION,
              backgroundColor: hex,
              border: '3px solid #FFFFFF',
              boxShadow: '0 3px 6px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.22)',
            }}
          >
            <span
              className="absolute left-1/2 top-1/2 block h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90"
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
