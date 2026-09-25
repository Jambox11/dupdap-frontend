'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, CheckCircle, XCircle, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd } from '@/lib/utils';
import type { Payment } from '@/lib/types';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-8 h-8 text-yellow-500" />,
  confirmed: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
  settling: <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />,
  settled: <CheckCircle className="w-8 h-8 text-green-500" />,
  failed: <XCircle className="w-8 h-8 text-red-500" />,
  expired: <XCircle className="w-8 h-8 text-gray-400" />,
};

const DEFAULT_STATUS_ICON = <Clock className="w-8 h-8 text-gray-400" />;

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 24;
const POLL_MAX_BACKOFF_MS = 60_000;

function computeExpiresAt(payment: any): Date | null {
  if (payment?.expiresAt) return new Date(payment.expiresAt);
  if (payment?.expiryMinutes && payment?.createdAt) {
    return new Date(new Date(payment.createdAt).getTime() + payment.expiryMinutes * 60_000);
  }
  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PayPage({ params }: { params: { paymentId: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [pollWarning, setPollWarning] = useState<string>('');
  const pollNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let pollAttempts = 0;
    let consecutiveFailures = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    paymentsApi.getByReference(params.paymentId)
      .then(({ data }) => setPayment(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));

    const scheduleNext = () => {
      if (cancelled) return;
      const backoff = Math.min(
        POLL_INTERVAL_MS * 2 ** consecutiveFailures,
        POLL_MAX_BACKOFF_MS,
      );
      timeout = setTimeout(poll, backoff);
    };

    const poll = () => {
      if (cancelled) return;
      pollAttempts += 1;
      if (pollAttempts >= POLL_MAX_ATTEMPTS) {
        setPollWarning('Status checks are taking longer than expected.');
        return;
      }
      paymentsApi.getByReference(params.paymentId)
        .then(({ data }) => {
          consecutiveFailures = 0;
          setPollWarning('');
          setPayment(data);
          if (['settled', 'failed', 'expired'].includes(data.status)) return;
          scheduleNext();
        })
        .catch(() => {
          consecutiveFailures += 1;
          setPollWarning('We are having trouble checking your payment status right now.');
          scheduleNext();
        });
    };

    // Expose an immediate poll trigger so visibilitychange can refresh
    // without waiting for the next scheduled interval tick.
    pollNowRef.current = () => {
      if (cancelled) return;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      poll();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      pollNowRef.current = null;
      if (timeout) clearTimeout(timeout);
    };
  }, [params.paymentId]);

  const expiresAt = payment ? computeExpiresAt(payment) : null;
  const isPending = payment?.status === 'pending';
  const remainingMs = expiresAt ? expiresAt.getTime() - now : 0;
  const isExpiredByClock = isPending && expiresAt ? remainingMs <= 0 : false;

  useEffect(() => {
    if (!isPending || !expiresAt) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isPending, expiresAt]);

  // When the tab becomes visible again, background throttling may have left
  // `now` and the polled `payment` state out of sync. Recompute `now` and
  // trigger an immediate poll so the countdown matches the latest status.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      pollNowRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {loadError ? 'Something went wrong loading this payment — try again' : 'Payment not found'}
          </p>
        </div>
      </div>
    );
  }

  const hasCryptoAmount = payment.amountXlm != null && payment.amountXlm > 0;
  const stellarUri = hasCryptoAmount
    ? `web+stellar:pay?destination=${encodeURIComponent(payment.stellarDepositAddress ?? '')}&amount=${encodeURIComponent(String(payment.amountXlm))}&memo=${encodeURIComponent(payment.stellarMemo)}&memo_type=text`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-[92vw] xs:max-w-sm">
        <div className="p-4 xs:p-6 border-b border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">DupDub</p>
          <h1 className="text-3xl font-bold mt-1">{formatUsd(payment.amountUsd)}</h1>
          {payment.description && <p className="text-sm text-gray-500 mt-1 break-words">{payment.description}</p>}
        </div>

        <div className="p-4 xs:p-6">
          {isPending ? (
            <>
              {expiresAt && (
                <div className={`flex items-center justify-center gap-2 rounded-lg p-3 mb-4 text-sm font-semibold ${
                  isExpiredByClock ? 'bg-red-50 text-red-700 border border-red-200' : remainingMs < 60_000 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {isExpiredByClock ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {isExpiredByClock ? 'This payment request has expired' : <>Expires in {formatRemaining(remainingMs)}</>}
                </div>
              )}

              <div className="flex justify-center mb-4">
                {stellarUri ? (
                  <div
                    className="bg-white p-3 rounded-xl border border-gray-200"
                    role="img"
                    aria-label={`Stellar payment QR code for ${formatUsd(payment.amountUsd)}`}
                  >
                    <QRCodeSVG value={stellarUri} size={160} />
                  </div>
                ) : (
                  <div
                    data-testid="crypto-amount-pending"
                    className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-2 w-44 h-44"
                  >
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <p className="text-xs text-gray-500">Calculating crypto exchange rate…</p>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-500 mb-4">
                Scan with a Stellar wallet app, then approve USDC before deposit
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs mb-4">
                <p className="font-semibold text-blue-900 mb-1">Required customer flow</p>
                <p className="text-blue-800">1) approve(escrow_contract, amount)</p>
                <p className="text-blue-800">2) deposit()</p>
                <p className="text-blue-700 mt-1">
                  Your wallet signs both steps. No private keys are shared with DupDub.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-3">
                <p className="text-xs text-gray-500 mb-1">Deposit address (exact)</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold break-all flex-1 text-gray-900">{payment.stellarDepositAddress}</code>
                  <button
                    onClick={() => copy(payment.stellarDepositAddress ?? '', 'address')}
                    aria-label="Copy deposit address"
                    className="shrink-0"
                  >
                    {copied === 'address' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              {STATUS_ICONS[payment.status] ?? DEFAULT_STATUS_ICON}
              <p className="mt-3 text-sm font-medium text-gray-700 capitalize">{payment.status}</p>
              {pollWarning && <p className="mt-2 text-xs text-amber-600">{pollWarning}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
