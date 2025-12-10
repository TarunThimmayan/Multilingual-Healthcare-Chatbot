'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { Check, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuth, isAuthenticated, type AuthUser } from '../../../utils/auth';
import { apiClient } from '../../../utils/api';
import WelcomeScreen from '../../../components/WelcomeScreen';

// Lazy load LightRays to improve initial render performance
const LightRays = dynamic(() => import('../../../components/LightRays'), {
  ssr: false,
  loading: () => null,
});

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    remember: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showWelcome, setShowWelcome] = useState(false);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete toastTimers.current[id];
    }, 3200);
    toastTimers.current[id] = timer;
  }, []);
  
  useEffect(() => {
    // Defer auth check to not block initial render
    const checkAuth = () => {
      if (isAuthenticated()) {
        router.push('/');
        return;
      }
      
      // Check for expired session
      if (typeof window !== 'undefined') {
        const authExpired = sessionStorage.getItem('authExpired');
        if (authExpired === 'true') {
          sessionStorage.removeItem('authExpired');
          addToast('Your session has expired. Please log in again.', 'info');
        }
      }
    };

    // Use requestIdleCallback for non-blocking execution
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(checkAuth, { timeout: 100 });
    } else {
      setTimeout(checkAuth, 0);
    }
  }, [router, addToast]);

  useEffect(() => () => {
    Object.values(toastTimers.current).forEach((timer) => clearTimeout(timer));
    toastTimers.current = {};
  }, []);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleLoginChange = (field: keyof typeof loginForm, value: string | boolean) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateLogin = () => {
    const nextErrors: Record<string, string> = {};
    if (!validateEmail(loginForm.email)) {
      nextErrors.email = 'Please provide the email you registered with.';
    }
    if (!loginForm.password) {
      nextErrors.password = 'Your password is required to continue.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (!validateLogin()) {
      addToast("Let's double-check your credentials.", 'error');
      return;
    }
    setLoading(true);
    
    try {
      const response = await apiClient.post('/auth/login', {
        email: loginForm.email,
        password: loginForm.password,
      });
      
      const user: AuthUser = {
        email: response.data.email,
        fullName: response.data.email.split('@')[0],
        createdAt: response.data.createdAt || new Date().toISOString(),
      };
      setAuth(user);
      
      addToast('You are safely signed in. How can we support you today?', 'success');
      setLoginForm((prev) => ({ ...prev, password: '' }));
      
      // Set flag to prevent immediate redirect on main page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justLoggedIn', 'true');
      }
      
      // Prefetch the main page before showing welcome animation
      router.prefetch('/');
      
      // Show welcome animation
      setShowWelcome(true);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || 'Invalid email or password. Please try again.';
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderToastIcon = (variant: ToastVariant) => {
    if (variant === 'success') return <Check className="h-4 w-4" aria-hidden />;
    if (variant === 'error') return <XCircle className="h-4 w-4" aria-hidden />;
    return <ShieldCheck className="h-4 w-4" aria-hidden />;
  };

  const [showAnimation, setShowAnimation] = useState(false);

  // Defer animation loading significantly to prioritize content rendering
  // Load animation only after page is fully interactive
  useEffect(() => {
    // Use requestIdleCallback for better performance, fallback to setTimeout
    const loadAnimation = () => {
      setShowAnimation(true);
    };
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(loadAnimation, { timeout: 1000 });
    } else {
      setTimeout(loadAnimation, 500);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(16,185,129,0.55),transparent_55%),radial-gradient(circle_at_85%_5%,rgba(34,197,94,0.4),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.35),transparent_60%),linear-gradient(180deg,rgba(5,46,22,0.95),rgba(6,78,59,0.95))]" />
      {/* LightRays Animation Background */}
      {showAnimation && (
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
          <LightRays
            raysOrigin="top-center"
            raysColor="#00ffff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
      )}
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-4 sm:px-6 sm:py-6 md:px-12 md:py-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          <header className="flex w-full flex-col items-center gap-2 sm:gap-3 text-center">
            <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.28em] sm:tracking-[0.32em] text-teal-100 shadow-lg shadow-teal-500/10">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
              SafeCare Companion
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl lg:text-5xl px-2">Welcome back</h1>
              <p className="max-w-2xl text-xs text-slate-300 sm:text-sm md:text-base px-2">
                Sign in to continue your personalised health guidance journey.
              </p>
            </div>
          </header>

          <main className="relative w-full">
            <div className="relative overflow-visible sm:overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-white/10 shadow-[0_35px_120px_rgba(15,23,42,0.55)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.12),_transparent_55%)]" aria-hidden />
              <div className="relative grid gap-0 md:grid-cols-2">
                <section className="hidden md:flex flex-col justify-between border-r border-white/10 bg-white/10 p-8 lg:p-10 text-slate-100">
                  <div className="space-y-6">
                    <p className="text-sm uppercase tracking-[0.28em] text-teal-100/80">Why people choose us</p>
                    <ul className="space-y-4 text-sm text-slate-200">
                      <li className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-400 to-teal-500 text-slate-900 shadow-lg shadow-emerald-500/30">
                          <ShieldCheck className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">Secure by design</h3>
                          <p className="text-sm text-slate-200/80">Enterprise-grade safety and privacy, purpose-built for healthcare experiences.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 text-slate-900 shadow-lg shadow-green-500/30">
                          <Check className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">Care that grows with you</h3>
                          <p className="text-sm text-slate-200/80">Personalised journeys with multilingual support, ready for your next question.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <footer className="hidden text-left text-xs text-slate-300/80 md:block">
                    Health information is shared securely and stays private.
                  </footer>
                </section>

                <section className="relative z-10 flex w-full flex-col bg-emerald-500/10 sm:bg-emerald-500/10 px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-6 md:px-10 md:pt-12 md:pb-12 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
                  <div className="mb-4 sm:mb-6 flex items-center text-slate-200">
                    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.24em] sm:tracking-[0.28em] text-teal-200/80">
                      <span className="inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-emerald-300" aria-hidden />
                      Welcome back
                    </div>
                  </div>

                  <form className="space-y-3 sm:space-y-4 md:space-y-6 relative z-10" onSubmit={handleLoginSubmit} noValidate style={{ pointerEvents: 'auto' }}>
                    <FloatingField
                      id="login-email"
                      label="Email address"
                      type="email"
                      value={loginForm.email}
                      onChange={(value) => handleLoginChange('email', value)}
                      placeholder="name@example.com"
                      error={errors.email}
                    />
                    <FloatingField
                      id="login-password"
                      label="Password"
                      type="password"
                      value={loginForm.password}
                      onChange={(value) => handleLoginChange('password', value)}
                      placeholder="Your secure password"
                      error={errors.password}
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={loginForm.remember}
                          onChange={(event) => handleLoginChange('remember', event.target.checked)}
                          className="h-4 w-4 rounded border-slate-500 bg-transparent text-emerald-400 focus:ring-emerald-300"
                        />
                        Remember me on this device
                      </label>
                      <button
                        type="button"
                        className="text-xs sm:text-sm font-semibold text-emerald-200 transition hover:text-white text-left sm:text-right"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={clsx(
                        'group relative mt-3 sm:mt-4 md:mt-6 flex w-full items-center justify-center gap-2 sm:gap-3 rounded-lg bg-gradient-to-r px-6 py-4 sm:px-8 sm:py-5 text-base sm:text-lg font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60',
                        'from-emerald-500 via-green-500 to-teal-500'
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" aria-hidden />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                          <span>Sign in</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 sm:mt-8 flex flex-col items-center gap-2 text-center relative z-30" style={{ pointerEvents: 'auto' }}>
                    <p className="text-[0.7rem] sm:text-xs text-slate-400">Your information is encrypted and stays confidential.</p>
                    <div className="text-xs sm:text-sm text-slate-200">
                      Don't have an account?{' '}
                      <Link 
                        href="/auth/signup" 
                        className="font-semibold text-teal-200 transition hover:text-white relative z-30 touch-manipulation cursor-pointer"
                        style={{ WebkitTapHighlightColor: 'transparent', pointerEvents: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        Sign up
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} renderIcon={renderToastIcon} />
      
      {/* Welcome Animation - shown after successful login */}
      {showWelcome && (
        <WelcomeScreen
          onComplete={() => {
            setShowWelcome(false);
            // Navigate to main page after animation completes
            router.push('/');
          }}
        />
      )}
    </div>
  );
}

interface FloatingFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
}

function FloatingField({ id, label, value, placeholder, onChange, type = 'text', error }: FloatingFieldProps) {
  const hasValue = value.length > 0;
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          placeholder=" "
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            'peer block w-full rounded-xl sm:rounded-2xl border bg-white/80 px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-medium text-slate-900 shadow-inner shadow-black/10 transition-all duration-200 placeholder-transparent',
            'focus:border-teal-400 focus:bg-white focus:shadow-lg focus:shadow-teal-500/15 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-200/40',
            error ? 'border-rose-300 ring-rose-200/40 focus:border-rose-400 focus:ring-rose-200/50' : 'border-slate-200'
          )}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        />
        <label
          htmlFor={id}
          className={clsx(
            'pointer-events-none absolute left-3 sm:left-4 top-2.5 sm:top-3 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-slate-400 transition-all duration-200',
            'peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[0.65rem] sm:peer-placeholder-shown:text-[0.7rem] peer-placeholder-shown:uppercase peer-placeholder-shown:tracking-[0.22em] sm:peer-placeholder-shown:tracking-[0.25em] peer-placeholder-shown:text-slate-400/80',
            hasValue && '-translate-y-2 text-[0.55rem] sm:text-[0.6rem] text-teal-500',
            'peer-focus:-translate-y-2 peer-focus:text-[0.55rem] sm:peer-focus:text-[0.6rem] peer-focus:text-teal-400'
          )}
        >
          {label}
        </label>
      </div>
      <div className="min-h-[18px] sm:min-h-[20px]">
        {error ? (
          <p id={describedBy} className="flex items-start gap-1.5 sm:gap-2 text-[0.7rem] sm:text-xs font-medium text-rose-200 leading-relaxed">
            <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </p>
        ) : (
          hasValue && (
            <p className="flex items-center gap-1.5 sm:gap-2 text-[0.7rem] sm:text-xs font-medium text-emerald-200">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" aria-hidden />
              Looks great!
            </p>
          )
        )}
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  renderIcon: (variant: ToastVariant) => React.ReactNode;
}

function ToastContainer({ toasts, renderIcon }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-4 z-50 mx-auto flex max-w-md flex-col gap-2 sm:gap-3 sm:inset-x-4 sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-auto pt-safe sm:pt-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/20 bg-white/90 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium shadow-lg shadow-slate-900/30 backdrop-blur',
            toast.variant === 'success' && 'text-emerald-700',
            toast.variant === 'error' && 'text-rose-700',
            toast.variant === 'info' && 'text-emerald-700'
          )}
        >
          <span className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-400 to-teal-500 text-white shadow-lg shadow-emerald-400/30">
            {renderIcon(toast.variant)}
          </span>
          <p className="flex-1 text-left text-xs sm:text-sm leading-relaxed">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

