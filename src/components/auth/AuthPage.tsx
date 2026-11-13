import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Phone, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { getErrorMessage } from '@/lib/errors';
import { isValidMobile, mobileToEmail, normalizeMobile } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { inputClass, labelClass } from '@/lib/styles';

type Mode = 'login' | 'signup';

const MIN_PASSWORD_LENGTH = 6;
const LOGIN_ERROR = 'Mobile number ya password ghalat hai.';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const signUp = async (cleanName: string, cleanMobile: string): Promise<string | null> => {
    const { data: taken, error: takenError } = await supabase.rpc('mobile_taken', { p_mobile: cleanMobile });
    if (takenError) return getErrorMessage(takenError);
    if (taken === true) return 'Ye mobile number pehle se registered hai. Login karein.';

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: mobileToEmail(cleanMobile),
      password,
      options: { data: { name: cleanName, mobile: cleanMobile } },
    });
    if (signUpError) {
      return signUpError.message.toLowerCase().includes('already')
        ? 'Ye mobile number pehle se registered hai. Login karein.'
        : getErrorMessage(signUpError);
    }

    if (!data.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: mobileToEmail(cleanMobile),
        password,
      });
      if (loginError) return 'Account ban gaya hai. Ab login karein.';
    }
    return null;
  };

  const logIn = async (cleanMobile: string): Promise<string | null> => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: mobileToEmail(cleanMobile),
      password,
    });
    return loginError ? LOGIN_ERROR : null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanMobile = normalizeMobile(mobile);

    if (isSignup && !cleanName) {
      setError('Apna naam likhein.');
      return;
    }
    if (!isValidMobile(cleanMobile)) {
      setError('Mobile number 03XXXXXXXXX format mein likhein (11 digits).');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password kam az kam ${MIN_PASSWORD_LENGTH} characters ka ho.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = isSignup ? await signUp(cleanName, cleanMobile) : await logIn(cleanMobile);
    setError(result);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <div className="relative overflow-hidden bg-emerald-950 px-6 pb-16 pt-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,183,0,0.25),transparent_65%)]" />
        <div className="relative flex flex-col items-center gap-3 animate-fade-in">
          <Logo size="md" />
          <p className="text-sm text-emerald-100">Khelo, Jeeto aur Inam Pao</p>
        </div>
      </div>

      <main className="mx-auto -mt-10 w-full max-w-md px-4 pb-12 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl animate-slide-up sm:p-8">
          <h1 className="text-2xl font-extrabold text-stone-900">
            {isSignup ? 'Naya Account Banayein' : 'Khush Aamdeed!'}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {isSignup ? 'Naam, mobile number aur password dein.' : 'Mobile number aur password se login karein.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1" role="tablist">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => switchMode(tab)}
                className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === tab ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab === 'login' ? 'Login' : 'Signup'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            {isSignup && (
              <div>
                <label htmlFor="auth-name" className={labelClass}>Naam</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Apna poora naam"
                    className={`${inputClass} pl-11`}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-mobile" className={labelClass}>Mobile Number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="auth-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="03XXXXXXXXX"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className={labelClass}>Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder="Kam az kam 6 characters"
                  className={`${inputClass} pl-11 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Password chhupayein' : 'Password dikhayein'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full py-3.5 text-base" loading={submitting}>
              {isSignup ? 'Account Banayein' : 'Login Karein'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600">
            {isSignup ? 'Pehle se account hai?' : 'Naya user ho?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
            >
              {isSignup ? 'Login karein' : 'Signup karein'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
