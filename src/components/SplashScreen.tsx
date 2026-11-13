import Logo from '@/components/ui/Logo';

export default function SplashScreen() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-emerald-950 px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,183,0,0.28),transparent_60%)]" />
      <div className="relative flex flex-col items-center animate-fade-in">
        <Logo size="xl" />
        <p className="mt-5 text-center text-base font-semibold text-gold-100">Khelo, Jeeto aur Inam Pao</p>
        <div className="mt-12 flex gap-2" aria-label="Loading">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-gold-400" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-gold-400 [animation-delay:150ms]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-gold-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
