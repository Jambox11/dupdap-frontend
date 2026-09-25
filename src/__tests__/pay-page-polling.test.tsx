/**
 * Tests for /pay/[paymentId] polling timer logic
 * Issue: interval fires every 5s, cleared on unmount, cleared on terminal status
 * Issue #312: visibilitychange recomputes countdown and triggers immediate poll
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { paymentsApi } from '@/lib/api';
import PayPage from '@/app/pay/[paymentId]/page';

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: jest.fn(),
  },
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qrcode" />,
}));

const mockGetByReference = paymentsApi.getByReference as jest.MockedFunction<typeof paymentsApi.getByReference>;

const PENDING_PAYMENT = {
  id: 'pay-001',
  reference: 'REF-001',
  amountUsd: 10,
  amountXlm: 25,
  status: 'pending' as const,
  stellarMemo: 'MEMO',
  stellarDepositAddress: 'GADDR',
  createdAt: new Date().toISOString(),
};

const defaultParams = { paymentId: 'REF-001' };

/**
 * Simulate the tab becoming visible again. jsdom's document.visibilityState is
 * read-only, so we redefine it and dispatch the visibilitychange event.
 */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => state === 'hidden',
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setVisibility('visible');
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('PayPage — polling timer logic', () => {
  it('calls getByReference once on mount (initial fetch)', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    // Flush the initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    // Initial fetch call
    expect(mockGetByReference).toHaveBeenCalledTimes(1);
  });

  it('fires the poll interval every 5000ms', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    // Flush initial fetch
    await act(async () => { await Promise.resolve(); });
    const afterMount = mockGetByReference.mock.calls.length; // 1

    // Advance 5s → 1 poll tick
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockGetByReference.mock.calls.length).toBe(afterMount + 1);

    // Advance another 5s → 2nd poll tick
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockGetByReference.mock.calls.length).toBe(afterMount + 2);
  });

  it('clears the interval on unmount', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    const { unmount } = render(<PayPage params={defaultParams} />);

    // Flush initial fetch
    await act(async () => { await Promise.resolve(); });
    const afterMount = mockGetByReference.mock.calls.length;

    // Advance 5s to confirm polling is running
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockGetByReference.mock.calls.length).toBe(afterMount + 1);

    // Unmount — interval should be cleared
    unmount();

    // Advance more time — no additional calls should happen
    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });
    expect(mockGetByReference.mock.calls.length).toBe(afterMount + 1);
  });

  it.each(['settled', 'failed', 'expired'] as const)(
    'stops polling when status becomes terminal: %s',
    async (terminalStatus) => {
      // First call (initial): returns pending
      // Second call (first poll tick): returns terminal status
      mockGetByReference
        .mockResolvedValueOnce({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>)
        .mockResolvedValue({
          data: { ...PENDING_PAYMENT, status: terminalStatus },
        } as ReturnType<typeof paymentsApi.getByReference>);

      render(<PayPage params={defaultParams} />);

      // Flush initial fetch
      await act(async () => { await Promise.resolve(); });

      // First poll tick → triggers terminal status → clears interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
        await Promise.resolve(); // flush the .then()
      });

      const callsAfterTerminal = mockGetByReference.mock.calls.length;

      // Advance much further — no new calls expected
      await act(async () => {
        jest.advanceTimersByTime(30000);
        await Promise.resolve();
      });

      expect(mockGetByReference.mock.calls.length).toBe(callsAfterTerminal);
    },
  );

  it('triggers an immediate poll when the tab becomes visible again', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    // Flush initial fetch
    await act(async () => { await Promise.resolve(); });
    const afterMount = mockGetByReference.mock.calls.length; // 1

    // Tab goes to background, then comes back before the next 5s tick
    await act(async () => {
      setVisibility('hidden');
      setVisibility('visible');
      await Promise.resolve();
    });

    // An immediate poll should have fired without waiting for the interval
    expect(mockGetByReference.mock.calls.length).toBe(afterMount + 1);
  });

  it('does not poll on visibilitychange while the tab is hidden', async () => {
    mockGetByReference.mockResolvedValue({ data: PENDING_PAYMENT } as ReturnType<typeof paymentsApi.getByReference>);

    render(<PayPage params={defaultParams} />);

    // Flush initial fetch
    await act(async () => { await Promise.resolve(); });
    const afterMount = mockGetByReference.mock.calls.length;

    await act(async () => {
      setVisibility('hidden');
      await Promise.resolve();
    });

    expect(mockGetByReference.mock.calls.length).toBe(afterMount);
  });
});
