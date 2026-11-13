import { useMemo } from 'react';

const CONFETTI_COLORS = ['#F5B700', '#14A44D', '#E11D2E', '#1E6FE0', '#FBBF24', '#FB923C'];

interface ConfettiProps {
  count?: number;
}

export default function Confetti({ count = 90 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.6 + Math.random() * 1.8,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
      })),
    [count]
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute -top-4 block animate-confetti"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.round ? 1 : 0.5),
            backgroundColor: piece.color,
            borderRadius: piece.round ? '9999px' : '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
