'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { COUNTRIES } from '@/lib/countries';
import { getErrorMessage } from '@/lib/errors';
import { isAuthResponse } from '@/lib/types';

interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
}

function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function passwordScore(checks: PasswordChecks): number {
  return Object.values(checks).filter(Boolean).length;
}

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
const STRENGTH_COLORS = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    country: '',
  });

  const checks = checkPassword(form.password);
  const score = passwordScore(checks);
  const passwordsMatch = form.confirmPassword.length === 0 || form.password === form.confirmPassword;
  const passwordValid = score >= 4 && checks.length && checks.lower && checks.upper && checks.number;
  const canSubmit = passwordValid && passwordsMatch;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return toast.error('Please meet the password requirements');
    if (!passwordsMatch) return toast.error('Passwords do not match');
    setFormError('');
    setLoading(true);
    try {
      const { data } = await authApi.register({
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        country: form.country || undefined,
      });
      if (!isAuthResponse(data)) {
        toast.error('Invalid response from server. Please try again.');
        return;
      }
      setAuth(data.accessToken, data.merchant);
      router.push('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err) ?? 'Registration failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Each field key doubles as the input id so htmlFor/id are always in sync (#156).
  const field = (
    key: keyof typeof form,
    label: string,
    type = 'text',
    required = true,
    autoComplete?: string,
  ) => (
    <div>
      <label htmlFor={key} className="label">{label}</label>
      <input
        id={key}
        className="input"
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const requirements: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'upper', label: 'An uppercase letter' },
    { key: 'lower', label: 'A lowercase letter' },
    { key: 'number', label: 'A number' },
    { key: 'special', label: 'A special character' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 mb-1">DupDub</h1>
          <p className="text-gray-500 text-sm">Create your merchant account</p>
        </div>

        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? 'Creating account, please wait…' : ''}
          </p>

          {formError && (
            <div
              data-testid="register-form-error"
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <fieldset disabled={loading} className="space-y-4">
            {field('businessName', 'Business Name', 'text', true, 'organization')}
            {field('email', 'Email', 'email', true, 'email')}

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {STRENGTH_COLORS.map((color, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < score ? color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Strength: {STRENGTH_LABELS[score]}
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1">
                    {requirements.map((r) => (
                      <li
                        key={r.key}
                        className={`text-xs flex items-center gap-1.5 ${checks[r.key] ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <span className="inline-block w-3.5 h-3.5 rounded-full text-center leading-3.5 text-[10px]">
                          {checks[r.key] ? '✓' : '•'}
                        </span>
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
              <input
                id="confirmPassword"
                className={`input ${form.confirmPassword.length > 0 && !passwordsMatch ? 'border-red-400 focus:ring-red-400' : ''}`}
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
              {form.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <div>
              <label htmlFor="country" className="label">Country (optional)</label>
              <select
                id="country"
                className="input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              data-testid="register-submit-button"
              type="submit"
              disabled={loading || !canSubmit}
              className="btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </fieldset>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
