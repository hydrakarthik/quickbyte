import { useState } from 'react';
import type { DemoUser } from '@/account/account';
import {
  displayNameFromEmail,
  hasErrors,
  normalizePhone,
  validateSignIn,
  validateSignUp,
  type FieldErrors,
} from '@/account/validation';
import { FoodImage } from '@/components/FoodImage';
import { CheckIcon } from '@/components/icons';
import { TextField } from '@/components/TextField';
import { heroImages } from '@/data/catalog';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';
type AuthField = 'name' | 'email' | 'phone' | 'password';

interface LoginPageProps {
  next: 'checkout' | null;
  onSignIn: (user: DemoUser) => void;
}

const PERKS = ['Live order tracking', 'Hand-picked local kitchens', 'Member-only offers'];

export function LoginPage({ next, onSignIn }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<AuthField>>({});

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
  }

  function submit() {
    const nextErrors: FieldErrors<AuthField> =
      mode === 'signup' ? validateSignUp({ name, email, phone, password }) : validateSignIn({ email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      const order: AuthField[] = ['name', 'email', 'phone', 'password'];
      const first = order.find((field) => nextErrors[field] !== undefined);
      if (first) document.getElementById(`auth-${first}`)?.focus();
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    onSignIn(
      mode === 'signup'
        ? { name: name.trim(), email: normalizedEmail, phone: normalizePhone(phone) }
        : { name: displayNameFromEmail(normalizedEmail), email: normalizedEmail, phone: '' },
    );
    // The password is only checked locally and is never stored.
    setPassword('');
  }

  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-8 px-4 py-8 md:grid-cols-2 md:px-6 md:py-14">
      <div className="relative hidden overflow-hidden rounded-3xl bg-linear-to-br from-primary to-[#7a240a] p-10 text-white md:block">
        <FoodImage src={heroImages.main} alt="" className="absolute inset-0 h-full w-full opacity-30 mix-blend-overlay" />
        <div className="relative">
          <p className="text-4xl font-black leading-tight">Your favourite food, a few taps away.</p>
          <ul className="mt-8 space-y-3 text-white/90">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 font-semibold">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                  <CheckIcon className="h-4 w-4" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {next === 'checkout' ? 'Sign in to finish placing your order.' : 'Order faster and track every delivery.'}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1">
          {(['signin', 'signup'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => {
                switchMode(option);
              }}
              className={cn(
                'min-h-11 rounded-lg text-sm font-bold transition',
                mode === option ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mt-6 space-y-4"
        >
          {mode === 'signup' ? (
            <TextField id="auth-name" label="Full name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
          ) : null}
          <TextField
            id="auth-email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
          />
          {mode === 'signup' ? (
            <TextField
              id="auth-phone"
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={setPhone}
              error={errors.phone}
              autoComplete="tel"
              inputMode="tel"
              placeholder="98765 43210"
            />
          ) : null}
          <TextField
            id="auth-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            {...(mode === 'signup' ? { hint: 'At least 8 characters with a letter and a number' } : {})}
          />
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Demo sign-in: any valid email and password works. Your name and email stay in this browser only, and your password is
          never stored or sent.
        </p>
      </div>
    </div>
  );
}