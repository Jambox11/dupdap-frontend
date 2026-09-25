'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { paymentsApi } from '@/lib/api';
import { formatUsd } from '@/lib/utils';
import type { PaymentStats } from '@/lib/types';

// Recharts is a large library only used on this page. Wrapping the chart
// components with next/dynamic (ssr: false) does two things:
//   1. Excludes recharts from the SSR pass (it references browser-only APIs).
//   2. Ensures the recharts bundle is code-split into a lazy chunk that is
//      only fetched when a merchant actually visits /dashboard/analytics —
//      merchants who never open analytics never download it.
const StatusPieChart = dynamic(() => import('./StatusPieChart'), {
  ssr: false,
  loading: () => <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">Loading chart…</div>,
});

const VolumeBarChart = dynamic(() => import('./VolumeBarChart'), {
  ssr: false,
  loading: () => <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">Loading chart…</div>,
});

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => {
    setLoading(true);
    setError('');
    paymentsApi.stats()
      .then(({ data }) => {
        setError('');
        setStats(data);
      })
      .catch(() => setError("Couldn't load analytics."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const pieData = stats.map((s) => ({
    name: s.status,
    value: parseInt(String(s.count), 10),
    amount: parseFloat(String(s.totalUsd ?? 0)),
  }));

  const totalVolume = stats.reduce((acc, s) => acc + parseFloat(String(s.totalUsd ?? 0)), 0);
  const totalCount = stats.reduce((acc, s) => acc + parseInt(String(s.count), 10), 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Payment volume and status breakdown</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <p>{error}</p>
          <button
            type="button"
            onClick={loadStats}
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-500 mb-1">Total Volume</p>
              <p className="text-3xl font-bold">{formatUsd(totalVolume)}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{totalCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Payment Count by Status</h2>
              <StatusPieChart data={pieData} />
              {/* Visually-hidden data table — same data as chart for screen readers */}
              <table className="sr-only">
                <caption>Payment Count by Status</caption>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-4">Volume by Status (USD)</h2>
              <VolumeBarChart data={pieData} />
              {/* Visually-hidden data table — same data as chart for screen readers */}
              <table className="sr-only">
                <caption>Volume by Status (USD)</caption>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Volume (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{formatUsd(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
