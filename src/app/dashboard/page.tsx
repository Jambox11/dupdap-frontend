'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, CreditCard, Banknote, Clock } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatUsd, formatDate, PAYMENT_STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/lib/utils';
import { aggregatePaymentStats } from '@/lib/dashboard-stats';
import { useAuthStore } from '@/lib/store';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import type { Payment, PaymentStats } from '@/lib/types';

export default function DashboardPage() {
  const { merchant } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([paymentsApi.list(1, 5), paymentsApi.stats()])
      .then(([p, s]) => {
        setError('');
        setPayments(p.data.payments);
        setStats(s.data);
      })
      .catch(() => setError("Couldn't load your dashboard right now."))
      .finally(() => setLoading(false));
  }, []);

  const { totalVolume, settledCount, pendingCount, totalPayments } = aggregatePaymentStats(stats);

  const statCards = useMemo(
    () => [
      { label: 'Total Volume', value: formatUsd(totalVolume), icon: TrendingUp, color: 'text-blue-600' },
      { label: 'Settled Payments', value: settledCount, icon: Banknote, color: 'text-green-600' },
      { label: 'Pending Payments', value: pendingCount, icon: Clock, color: 'text-yellow-600' },
      { label: 'Total Payments', value: totalPayments, icon: CreditCard, color: 'text-purple-600' },
    ],
    [totalVolume, settledCount, pendingCount, totalPayments],
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{merchant?.businessName ? `, ${merchant.businessName}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Recent payments */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {error ? (
            <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
          ) : loading ? (
            <SkeletonList rows={5} />
          ) : payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.reference}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? DEFAULT_STATUS_COLOR}`}>
                    {p.status}
                  </span>
                  <span className="text-sm font-semibold">{formatUsd(p.amountUsd)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
