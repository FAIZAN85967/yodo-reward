import { useState, type FormEvent } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { inputClass, labelClass } from '@/lib/styles';

interface AdminLoginProps {
  onSubmit: (email: string, password: string) => Promise<string | null>;
}

export default function AdminLogin({ onSubmit }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Email aur password dono likhein.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await onSubmit(email.trim(), password);
    setError(result);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8 animate-slide-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="sm" />
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </span>
          <h1 className="text-2xl font-extrabold text-stone-900">Admin Login</h1>
          <p className="text-sm text-stone-600">Sirf admin account se login karein.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="admin-email" className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full py-3.5 text-base" loading={submitting}>
            Admin Panel Kholein
          </Button>
        </form>
      </div>
    </div>
  );
}
