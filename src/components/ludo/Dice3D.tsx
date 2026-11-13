import { useEffect, useState } from 'react';

export interface DiceRoll {
  id: number;
  face: number;
}

interface Dice3DProps {
  roll: DiceRoll;
  size?: number;
  disabled?: boolean;
  onRoll?: () => void;
}

interface Angles {
  x: number;
  y: number;
}

const FACE_ANGLES: Record<number, Angles> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const FACE_TRANSFORMS: { face: number; transform: string }[] = [
  { face: 1, transform: 'translateZ(var(--half))' },
  { face: 6, transform: 'rotateY(180deg) translateZ(var(--half))' },
  { face: 3, transform: 'rotateY(90deg) translateZ(var(--half))' },
  { face: 4, transform: 'rotateY(-90deg) translateZ(var(--half))' },
  { face: 2, transform: 'rotateX(90deg) translateZ(var(--half))' },
  { face: 5, transform: 'rotateX(-90deg) translateZ(var(--half))' },
];

function spinTo(current: number, target: number): number {
  const base = current + 4 * 360;
  return base + (((target - base) % 360) + 360) % 360;
}

export default function Dice3D({ roll, size = 96, disabled = false, onRoll }: Dice3DProps) {
  const [angles, setAngles] = useState<Angles>(FACE_ANGLES[1]);

  useEffect(() => {
    if (roll.id === 0) return;
    const target = FACE_ANGLES[roll.face];
    setAngles((prev) => ({ x: spinTo(prev.x, target.x), y: spinTo(prev.y, target.y) }));
  }, [roll]);

  const half = size / 2;
  const pipSize = size * 0.17;
  const interactive = Boolean(onRoll) && !disabled;

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={!interactive}
      aria-label={interactive ? 'Dice phenkein' : `Dice: ${roll.face}`}
      className={`group relative shrink-0 rounded-2xl p-0 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ width: size, height: size, perspective: size * 6 }}
    >
      <span
        className="absolute inset-0 block"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${angles.x}deg) rotateY(${angles.y}deg)`,
          transition: 'transform 1100ms cubic-bezier(0.15, 0.7, 0.2, 1)',
          ['--half' as string]: `${half}px`,
        }}
      >
        {FACE_TRANSFORMS.map(({ face, transform }) => (
          <span
            key={face}
            className="absolute inset-0 rounded-2xl border border-stone-300 bg-white shadow-inner"
            style={{ transform, backfaceVisibility: 'hidden' }}
          >
            {PIPS[face].map(([row, col]) => (
              <span
                key={`${row}-${col}`}
                className="absolute rounded-full bg-stone-900 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.25)]"
                style={{
                  width: pipSize,
                  height: pipSize,
                  left: `calc(${(col * 33.33 + 16.67)}% - ${pipSize / 2}px)`,
                  top: `calc(${(row * 33.33 + 16.67)}% - ${pipSize / 2}px)`,
                }}
              />
            ))}
          </span>
        ))}
      </span>
    </button>
  );
}
