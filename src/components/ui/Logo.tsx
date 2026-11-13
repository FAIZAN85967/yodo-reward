import { Crown } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'xl';
}

const TEXT_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  xl: 'text-4xl sm:text-6xl',
} as const;

const ICON_SIZE = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  xl: 'h-12 w-12 sm:h-16 sm:w-16',
} as const;

export default function Logo({ size = 'md' }: LogoProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <Crown className={`${ICON_SIZE[size]} fill-gold-400 text-gold-500 drop-shadow-md`} strokeWidth={2} />
      <span className={`${TEXT_SIZE[size]} gold-text font-extrabold tracking-wide`}>YODO REWARD</span>
    </div>
  );
}
