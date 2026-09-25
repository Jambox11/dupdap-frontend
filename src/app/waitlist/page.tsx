'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { waitlistApi } from '@/lib/api';
import { FormField } from '@/components/FormField';
import { getErrorMessage } from '@/lib/errors';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export default function WaitlistPage() {
  const [form, setForm] = useState({ email: '', username: '', businessName: '', country: '' });
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [formError, setFormError] = useState('');

  // Debounced live availability check for the optional username field.
  useEffect(() => {
    const username = form.username.trim();
    if (!username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const { data } = await waitlistApi.checkUsername(username);
        // Tolerate a few common response shapes: { available }, { taken }, { exists }.
        let available: boolean;
        if (typeof data?.available === 'boolean') available = data.available;
        else if (typeof data?.taken === 'boolean') available = !data.taken;
        else if (typeof data?.exists === 'boolean') available = !data.exists;
        else available = true;
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [form.username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken') {
      toast.error('That username is already taken');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await waitlistApi.join(form);
      setJoined(true);
    } catch (err) {
      const msg = getErrorMessage(err) ?? 'Failed to join waitlist';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Link href="/" className="font-bold text-xl text-brand-600">DupDub</Link>
          <h2 className="text-2xl font-bold mt-4 mb-2">Join the waitlist</h2>
          <p className="text-gray-500 text-sm">Be first to access DupDub when we launch</p>
        </div>

        {joined ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">You&apos;re on the list!</h3>
            <p className="text-gray-500 text-sm mt-2">We&apos;ll reach out when your account is ready.</p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setForm({ email: '', username: '', businessName: '', country: '' });
                  setUsernameStatus('idle');
                  setJoined(false);
                }}
                className="btn-secondary w-full"
              >
                Add another signup
              </button>
              <Link href="/" className="block text-sm text-brand-600 font-medium hover:underline">
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
            {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {loading ? 'Submitting, please wait…' : ''}
            </p>
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <fieldset disabled={loading} className="space-y-4">
              <FormField label="Email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormField label="Username (optional)" type="text" required={false} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <FormField label="Business Name (optional)" type="text" required={false} value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              <FormField label="Country (optional)" type="text" required={false} value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <button data-testid="waitlist-submit-button" type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Joining...' : 'Join waitlist'}
              </button>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
}
