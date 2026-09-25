'use client';

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { settlementsApi } from '@/lib/api';
import { formatUsd, formatDate, STATUS_COLORS } from '@/lib/utils';
import { SkeletonList, SkeletonTableRows } from '@/components/Skeleton';
import type { Settlement } from '@/lib/types';

// ---------------------------------------------------------------------------
// Memoized row components — skips re-renders caused by parent state changes
// (pagination, error state) that don't affect already-rendered rows.
// ---------------------------------------------------------------------------

interface SettlementRowProps {
  settlement: Settlement;
}

/** Desktop table row */
const SettlementTableRow = memo(function SettlementTableRow({ settlement: s }: SettlementRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 font-mono text-xs text-gray-500">
        <Link href={`/dashboard/settlements/${s.id}`} className="hover:text-brand-700 hover:underline">
          {s.id.slice(0, 8)}...
        </Link>
      </td>
      <td className="px-6 py-4">{formatUsd(s.totalAmountUsd)}</td>
      <td className="px-6 py-4 text-red-600">-{formatUsd(s.feeAmountUsd)}</td>
      <td className="px-6 py-4 font-semibold text-green-700">{formatUsd(s.netAmountUsd)}</td>
      <td className="px-6 py-4">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
          {s.status}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-500">{formatDate(s.createdAt)}</td>
    </tr>
  );
});

/** Mobile card */
const SettlementMobileCard = memo(function SettlementMobileCard({ settlement: s }: SettlementRowProps) {
  return (
    <div className="px-6 py-4 space-y-1">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/settlements/${s.id}`}
          className="font-mono text-xs text-gray-500 hover:text-brand-700 hover:underline"
        >
          {s.id.slice(0, 8)}...
        </Link>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
          {s.status}
        </span>
      </div>
      <div className="font-semibold text-green-700">{formatUsd(s.netAmountUsd)}</div>
      <div className="text-xs text-gray-500">
        Gross {formatUsd(s.totalAmountUsd)} · Fee -{formatUsd(s.feeAmountUsd)}
      </div>
      <div className="text-xs text-gray-500">{formatDate(s.createdAt)}</div>
    </div>
  );
});

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    settlementsApi.list(page, 20).then(({ data }) => {
      setError('');
      setSettlements(data.settlements);
      setTotal(data.total);
    }).catch(() => {
      setError("Couldn't load settlements.");
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total settlements</p>
      </div>

      <div className="card">
        {error ? <div className="px-6 py-4 text-sm text-red-500">{error}</div> : null}
        {loading ? (
          <span role="status" aria-live="polite" className="sr-only">
            Loading settlements…
          </span>
        ) : null}
        {/* Mobile card layout */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <SkeletonList rows={6} />
          ) : settlements.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">No settlements yet</div>
          ) : (
            settlements.map((s) => (
              <SettlementMobileCard key={s.id} settlement={s} />
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : settlements.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No settlements yet</td></tr>
              ) : (
                settlements.map((s) => (
                  <SettlementTableRow key={s.id} settlement={s} />
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 20 || page > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="btn-secondary text-sm px-3 py-1">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
