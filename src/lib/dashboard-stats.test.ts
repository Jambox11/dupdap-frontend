import { describe, expect, it } from 'vitest';
import { aggregatePaymentStats } from './dashboard-stats';
import type { PaymentStats } from './types';

describe('aggregatePaymentStats', () => {
  it('returns zeros for an empty stats array', () => {
    const result = aggregatePaymentStats([]);

    expect(result).toEqual({
      statMap: {},
      totalVolume: 0,
      settledCount: 0,
      pendingCount: 0,
      totalPayments: 0,
    });
  });

  it('aggregates a single status entry', () => {
    const stats: PaymentStats[] = [{ status: 'settled', count: '12', totalUsd: '4500.50' }];
    const result = aggregatePaymentStats(stats);

    expect(result.statMap.settled).toEqual({ count: 12, total: 4500.5 });
    expect(result.totalVolume).toBe(4500.5);
    expect(result.settledCount).toBe(12);
    expect(result.pendingCount).toBe(0);
    expect(result.totalPayments).toBe(12);
  });

  it('aggregates multiple statuses and sums total volume and payment count', () => {
    const stats: PaymentStats[] = [
      { status: 'settled', count: '10', totalUsd: '1000' },
      { status: 'pending', count: '5', totalUsd: '250.25' },
      { status: 'failed', count: '2', totalUsd: '50' },
    ];
    const result = aggregatePaymentStats(stats);

    expect(result.statMap.settled).toEqual({ count: 10, total: 1000 });
    expect(result.statMap.pending).toEqual({ count: 5, total: 250.25 });
    expect(result.statMap.failed).toEqual({ count: 2, total: 50 });
    expect(result.totalVolume).toBe(1300.25);
    expect(result.settledCount).toBe(10);
    expect(result.pendingCount).toBe(5);
    expect(result.totalPayments).toBe(17);
  });

  it('treats malformed count and totalUsd as zero', () => {
    const stats: PaymentStats[] = [
      { status: 'settled', count: 'not-a-number', totalUsd: 'bad' },
      { status: 'pending', count: '', totalUsd: undefined },
    ];
    const result = aggregatePaymentStats(stats);

    expect(result.statMap.settled).toEqual({ count: 0, total: 0 });
    expect(result.statMap.pending).toEqual({ count: 0, total: 0 });
    expect(result.totalVolume).toBe(0);
    expect(result.totalPayments).toBe(0);
  });

  it('handles absent statuses by defaulting counts to zero and leaving map keys undefined', () => {
    const stats: PaymentStats[] = [
      { status: 'failed', count: '4', totalUsd: '120.00' },
      { status: 'refunded', count: '1', totalUsd: '35.50' },
    ];
    const result = aggregatePaymentStats(stats);

    expect(result.settledCount).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.statMap.settled).toBeUndefined();
    expect(result.statMap.pending).toBeUndefined();
    expect(result.statMap.unknown_status).toBeUndefined();
    expect(result.statMap.failed).toEqual({ count: 4, total: 120 });
    expect(result.statMap.refunded).toEqual({ count: 1, total: 35.5 });
    expect(result.totalVolume).toBe(155.5);
    expect(result.totalPayments).toBe(5);
  });
});
