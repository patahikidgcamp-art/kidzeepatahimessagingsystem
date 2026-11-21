import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  School,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { AdminUserInfo, setAuthSession } from '../utils/authClient';

interface AdminLoginScreenProps {
  onAuthenticated: (user: AdminUserInfo) => void;
  sessionNotice?: string | null;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onAuthenticated,
  sessionNotice,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(sessionNotice || null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage('Please enter both Admin Username and Password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUser,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.token) {
        if (res.status === 429 && data.retryAfterSec) {
          setLockoutSeconds(Number(data.retryAfterSec) || 60);
        }
        setErrorMessage(data.error || 'Access denied. Please verify your credentials.');
        return;
      }

      setAuthSession(data.token, data.user);
      onAuthenticated(data.user);
    } catch {
      setErrorMessage('Unable to reach authentication server. Please verify server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Brand & Security Posture Panel */}
        <div className="md:col-span-5 bg-slate-900 text-white p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md">
                <School className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  Kidzee School
                </h1>
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Admin Control Suite
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <h2 className="text-xl font-bold leading-snug text-slate-50">
                Authorized Administration Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Protected workspace for student fee ledgers, Pending Dues PDF notices, designer WhatsApp messaging templates, and multi-device parent broadcasts.
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">HMAC Session Verification</div>
                  <div className="text-[11px] text-slate-400">
                    All student records, dues exports, and WhatsApp routes reject unauthenticated requests.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Brute-Force Lockout</div>
                  <div className="text-[11px] text-slate-400">
                    Automatic 60-second security lock after 5 consecutive failed sign-in attempts.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Port 3000 Protected Gateway</span>
            <span className="font-mono text-emerald-400 font-semibold">TLS / HMAC-SHA256</span>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Sign-In Required</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Enter Software Portal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your authorized administrator credentials to unlock Kidzee School operations.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">
                {errorMessage}
                {lockoutSeconds > 0 && (
                  <span className="block font-mono text-[11px] text-rose-700 mt-1">
                    Retry available in {lockoutSeconds}s
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  disabled={isSubmitting || lockoutSeconds > 0}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={isSubmitting || lockoutSeconds > 0}
                  className="w-full pl-10 pr-11 py-2.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <span>
                {lockoutSeconds > 0
                  ? `Locked (${lockoutSeconds}s)`
                  : isSubmitting
                  ? 'Verifying Credentials...'
                  : 'Unlock Admin Dashboard'}
              </span>
              {!isSubmitting && lockoutSeconds === 0 && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-6 text-center">
            Unauthorized access attempts are logged and rate-limited automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
