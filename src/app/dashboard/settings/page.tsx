'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { merchantApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FormField } from '@/components/FormField';
import { getErrorMessage } from '@/lib/errors';

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
}

export default function SettingsPage() {
  const { merchant } = useAuthStore();
  const [form, setForm] = useState({ businessName: '', country: '', bankAccountNumber: '', bankCode: '', bankName: '' });
  const [currentScopes, setCurrentScopes] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['payments:read', 'settlements:read']);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    merchantApi.profile()
      .then(({ data }) => {
        const apiKeyScopes = data.apiKeyScopes ?? [];
        setForm({
          businessName: data.businessName ?? '',
          country: data.country ?? '',
          bankAccountNumber: data.bankAccountNumber ?? '',
          bankCode: data.bankCode ?? '',
          bankName: data.bankName ?? '',
        });
        setCurrentScopes(apiKeyScopes);
        setSelectedScopes(apiKeyScopes.length > 0 ? apiKeyScopes : ['payments:read', 'settlements:read']);
      })
      .catch(() => {
        toast.error("Couldn't load your profile");
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      await merchantApi.update(form);
      toast.success('Profile updated');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors && typeof errors === 'object') {
        const normalized: Record<string, string> = {};
        for (const [field, msg] of Object.entries(errors)) {
          normalized[field] = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }
        setFieldErrors(normalized);
        const first = Object.values(normalized)[0];
        toast.error(first ?? getErrorMessage(err));
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  };

  const generateKey = async () => {
    setGeneratingKey(true);
    try {
      const { data } = await merchantApi.generateApiKey(selectedScopes);
      setApiKey(data.apiKey);
      setKeyRevealed(false);
      setKeyCopied(false);
      toast.success('API key generated — save it now, it won\'t be shown again');
    } catch {
      toast.error('Failed to generate API key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      toast.error('Failed to copy API key');
    }
  };

  const dismissApiKey = () => {
    setApiKey(null);
    setKeyRevealed(false);
    setKeyCopied(false);
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Business Profile</h2>
        <form onSubmit={save} className="space-y-4" aria-busy={saving}>
          {/* Visually-hidden live region announces save outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {saving ? 'Saving changes, please wait…' : ''}
          </p>
          {[
            { key: 'businessName', label: 'Business Name' },
            { key: 'country', label: 'Country' },
            { key: 'bankName', label: 'Bank Name' },
            { key: 'bankCode', label: 'Bank Code', inputMode: 'numeric' as const, pattern: '[0-9]{3,6}' },
            { key: 'bankAccountNumber', label: 'Bank Account Number', inputMode: 'numeric' as const, pattern: '[0-9]{6,17}' },
          ].map(({ key, label, inputMode, pattern }) => (
            <FormField
              key={key}
              id={key}
              label={label}
              inputMode={inputMode}
              pattern={pattern}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              error={fieldErrors[key]}
            />
          ))}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-2">API Key</h2>
        <p className="text-sm text-gray-500 mb-4">Use your API key to authenticate server-side API requests.</p>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Current key scopes</p>
          {currentScopes.length > 0 ? (
            <ul className="list-disc list-inside text-sm text-gray-700 mb-3">
              {currentScopes.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No API key scopes assigned yet.</p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Select scopes for new key</p>
          {[
            { value: 'payments:read', label: 'Payments: read' },
            { value: 'payments:write', label: 'Payments: write' },
            { value: 'settlements:read', label: 'Settlements: read' },
            { value: 'webhooks:manage', label: 'Webhooks: manage' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 mb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={selectedScopes.includes(value)}
                onChange={() => toggleScope(value)}
              />
              {label}
            </label>
          ))}
        </div>

        {apiKey ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">
              Save this key now — it won&apos;t be shown again
            </p>
            <div className="flex items-center gap-2 bg-gray-900 text-green-400 font-mono text-sm p-3 rounded-lg">
              <code className="flex-1 break-all">
                {keyRevealed ? apiKey : maskApiKey(apiKey)}
              </code>
              <button
                type="button"
                onClick={() => setKeyRevealed((current) => !current)}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-200"
                aria-label={keyRevealed ? 'Hide API key' : 'Reveal API key'}
              >
                {keyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={copyApiKey}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-200"
                aria-label="Copy API key"
              >
                {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={dismissApiKey}
              className="mt-3 text-sm text-amber-900 underline"
            >
              I&apos;ve saved it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={generateKey}
            disabled={generatingKey}
            className="btn-primary"
          >
            {generatingKey ? 'Generating...' : 'Generate new API key'}
          </button>
        )}
      </div>
    </div>
  );
}
