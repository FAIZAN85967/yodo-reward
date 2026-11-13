export type Coord = readonly [number, number];

export const BASE = -1;
export const HOME_PROGRESS = 57;
export const LANE_START = 52;
export const TRACK_LENGTH = 52;
export const BOARD_SIZE = 15;
export const PLAYER_COLOR_IDS = [0, 2] as const;

export const LUDO_COLORS = [
  { id: 0, name: 'Red', hex: '#E11D2E', base: [9, 0] as Coord },
  { id: 1, name: 'Blue', hex: '#1E6FE0', base: [0, 0] as Coord },
  { id: 2, name: 'Yellow', hex: '#F5B700', base: [0, 9] as Coord },
  { id: 3, name: 'Green', hex: '#14A44D', base: [9, 9] as Coord },
] as const;

const TRACK: readonly Coord[] = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
];

const LANES: readonly (readonly Coord[])[] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];

const CENTER: Coord = [7, 7];
const BASE_SPOTS: readonly Coord[] = [[1, 1], [1, 4], [4, 1], [4, 4]];
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const key = (r: number, c: number) => `${r},${c}`;
const TRACK_INDEX = new Map<string, number>(TRACK.map(([r, c], i) => [key(r, c), i]));
const LANE_COLOR = new Map<string, number>();
LANES.forEach((lane, color) => lane.forEach(([r, c]) => LANE_COLOR.set(key(r, c), color)));

export function trackIndexAt(r: number, c: number): number | undefined {
  return TRACK_INDEX.get(key(r, c));
}

export function laneColorAt(r: number, c: number): number | undefined {
  return LANE_COLOR.get(key(r, c));
}

export function yardColorAt(r: number, c: number): number | undefined {
  return LUDO_COLORS.find(({ base }) => r >= base[0] && r < base[0] + 6 && c >= base[1] && c < base[1] + 6)?.id;
}

export function isSafeTrackIndex(index: number): boolean {
  return SAFE_TRACK_INDICES.includes(index);
}

export function isStartIndex(index: number): boolean {
  return index % 13 === 0;
}

export function absoluteTrackIndex(color: number, progress: number): number {
  return (color * 13 + progress) % TRACK_LENGTH;
}

export function tokenPosition(color: number, tokenIndex: number, progress: number): Coord {
  if (progress === BASE) {
    const [r, c] = LUDO_COLORS[color].base;
    const [dr, dc] = BASE_SPOTS[tokenIndex];
    return [r + dr, c + dc];
  }
  if (progress === HOME_PROGRESS) return CENTER;
  if (progress >= LANE_START) return LANES[color][progress - LANE_START];
  return TRACK[absoluteTrackIndex(color, progress)];
}

export interface LudoState {
  tokens: number[][];
  turn: number;
  dice: number | null;
  winner: number | null;
}

export function createGame(): LudoState {
  return {
    tokens: LUDO_COLORS.map(() => [BASE, BASE, BASE, BASE]),
    turn: 0,
    dice: null,
    winner: null,
  };
}

function canMove(progress: number, dice: number): boolean {
  if (progress === BASE) return dice === 6;
  return progress + dice <= HOME_PROGRESS;
}

export function legalMoves(state: LudoState): number[] {
  if (state.dice === null || state.winner !== null) return [];
  const color = PLAYER_COLOR_IDS[state.turn];
  const dice = state.dice;
  return state.tokens[color].flatMap((progress, index) => (canMove(progress, dice) ? [index] : []));
}

export function movePath(state: LudoState, tokenIndex: number): number[] {
  if (state.dice === null) return [];
  const from = state.tokens[PLAYER_COLOR_IDS[state.turn]][tokenIndex];
  if (from === BASE) return [0];
  return Array.from({ length: state.dice }, (_, step) => from + step + 1);
}

function captureOpponents(tokens: number[][], color: number, progress: number) {
  const absolute = absoluteTrackIndex(color, progress);
  if (isSafeTrackIndex(absolute)) return;
  for (const other of PLAYER_COLOR_IDS) {
    if (other === color) continue;
    tokens[other] = tokens[other].map((p) =>
      p >= 0 && p < TRACK_LENGTH && absoluteTrackIndex(other, p) === absolute ? BASE : p
    );
  }
}

export function commitMove(state: LudoState, tokenIndex: number): LudoState {
  if (state.dice === null || !legalMoves(state).includes(tokenIndex)) return state;
  const dice = state.dice;
  const color = PLAYER_COLOR_IDS[state.turn];
  const tokens = state.tokens.map((arr) => [...arr]);
  const from = tokens[color][tokenIndex];
  const to = from === BASE ? 0 : from + dice;
  tokens[color][tokenIndex] = to;
  if (to < TRACK_LENGTH) captureOpponents(tokens, color, to);

  const winner = tokens[color].every((p) => p === HOME_PROGRESS) ? state.turn : null;
  const keepTurn = winner !== null || dice === 6;
  return {
    tokens,
    turn: keepTurn ? state.turn : (state.turn + 1) % PLAYER_COLOR_IDS.length,
    dice: null,
    winner,
  };
}

export function passTurn(state: LudoState): LudoState {
  return { ...state, dice: null, turn: (state.turn + 1) % PLAYER_COLOR_IDS.length };
}
