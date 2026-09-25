import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import PayPage from '@/app/pay/[paymentId]/page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: vi.fn(),
  },
}));

// Mock qrcode.react to expose the value prop for assertion
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-svg" data-qr-value={value} />,
}));

const mockBasePayment = {
  id: 'pay_123',
  reference: 'REF-TEST-99',
  amountUsd: 100,
  amountXlm: 850.5,
  status: 'pending',
  stellarDepositAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  stellarMemo: 'MEMO-XYZ',
  createdAt: '2026-09-25T10:00:00.000Z',
  expiryMinutes: 30,
};

describe('PayPage — crypto amount & stellarUri safety (#398)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the payment QR code with amountXlm when amountXlm is provided', async () => {
    vi.mocked(paymentsApi.getByReference).mockResolvedValue({
      data: mockBasePayment,
    } as any);

    render(<PayPage params={{ paymentId: 'REF-TEST-99' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-svg')).toBeInTheDocument();
    });

    const qrElement = screen.getByTestId('qr-svg');
    const uri = qrElement.getAttribute('data-qr-value');
    expect(uri).toContain('amount=850.5');
    expect(uri).not.toContain('amount=100');
  });

  it('does NOT substitute amountUsd when amountXlm is undefined, showing pending placeholder', async () => {
    const paymentWithoutXlm = {
      ...mockBasePayment,
      amountXlm: undefined,
    };

    vi.mocked(paymentsApi.getByReference).mockResolvedValue({
      data: paymentWithoutXlm,
    } as any);

    render(<PayPage params={{ paymentId: 'REF-TEST-99' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('crypto-amount-pending')).toBeInTheDocument();
    });

    // QR code must NOT be rendered
    expect(screen.queryByTestId('qr-svg')).not.toBeInTheDocument();
    expect(screen.getByText('Calculating crypto exchange rate…')).toBeInTheDocument();
  });

  it('does NOT substitute amountUsd when amountXlm is null, showing pending placeholder', async () => {
    const paymentWithNullXlm = {
      ...mockBasePayment,
      amountXlm: null,
    };

    vi.mocked(paymentsApi.getByReference).mockResolvedValue({
      data: paymentWithNullXlm,
    } as any);

    render(<PayPage params={{ paymentId: 'REF-TEST-99' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('crypto-amount-pending')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('qr-svg')).not.toBeInTheDocument();
  });
});
