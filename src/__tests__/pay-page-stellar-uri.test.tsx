import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PayPage from '@/app/pay/[paymentId]/page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    getByReference: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qrcode" data-value={value} />
  ),
}));

const mockGetByReference = vi.mocked(paymentsApi.getByReference);

describe('PayPage — stellarUri construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('constructs standard web+stellar URI with amountXlm when present', async () => {
    mockGetByReference.mockResolvedValueOnce({
      data: {
        id: 'pay-001',
        reference: 'REF-001',
        amountUsd: 50.0,
        amountXlm: 250,
        status: 'pending',
        description: 'Order #123',
        stellarMemo: 'MEMO-ABC-123',
        stellarDepositAddress: 'GADDR1234567890ABCDEF',
        createdAt: new Date().toISOString(),
      },
    } as any);

    render(<PayPage params={{ paymentId: 'REF-001' }} />);

    const qrElement = await screen.findByTestId('qrcode');
    const uri = qrElement.getAttribute('data-value');

    const expectedUri =
      'web+stellar:pay?destination=GADDR1234567890ABCDEF&amount=250&memo=MEMO-ABC-123&memo_type=text';
    expect(uri).toBe(expectedUri);
  });

  it('falls back to amountUsd in stellarUri when amountXlm is omitted', async () => {
    mockGetByReference.mockResolvedValueOnce({
      data: {
        id: 'pay-002',
        reference: 'REF-002',
        amountUsd: 75.5,
        amountXlm: undefined,
        status: 'pending',
        description: 'USD-only payment',
        stellarMemo: 'MEMO-USD',
        stellarDepositAddress: 'GADDR9876543210ZYXWVU',
        createdAt: new Date().toISOString(),
      },
    } as any);

    render(<PayPage params={{ paymentId: 'REF-002' }} />);

    const qrElement = await screen.findByTestId('qrcode');
    const uri = qrElement.getAttribute('data-value');

    const expectedUri =
      'web+stellar:pay?destination=GADDR9876543210ZYXWVU&amount=75.5&memo=MEMO-USD&memo_type=text';
    expect(uri).toBe(expectedUri);
  });

  it('properly encodes special characters in memo and address', async () => {
    mockGetByReference.mockResolvedValueOnce({
      data: {
        id: 'pay-003',
        reference: 'REF-003',
        amountUsd: 10,
        amountXlm: 50,
        status: 'pending',
        description: 'Special chars',
        stellarMemo: 'Invoice & Note = 100% + VIP #1',
        stellarDepositAddress: 'GADDR?special=true&mode=live',
        createdAt: new Date().toISOString(),
      },
    } as any);

    render(<PayPage params={{ paymentId: 'REF-003' }} />);

    const qrElement = await screen.findByTestId('qrcode');
    const uri = qrElement.getAttribute('data-value');

    const expectedDestination = encodeURIComponent('GADDR?special=true&mode=live');
    const expectedMemo = encodeURIComponent('Invoice & Note = 100% + VIP #1');
    const expectedUri = `web+stellar:pay?destination=${expectedDestination}&amount=50&memo=${expectedMemo}&memo_type=text`;

    expect(uri).toBe(expectedUri);
  });

  it('encodes empty destination when stellarDepositAddress is missing', async () => {
    mockGetByReference.mockResolvedValueOnce({
      data: {
        id: 'pay-004',
        reference: 'REF-004',
        amountUsd: 15,
        amountXlm: 60,
        status: 'pending',
        stellarMemo: 'MEMO-NO-ADDR',
        stellarDepositAddress: undefined,
        createdAt: new Date().toISOString(),
      },
    } as any);

    render(<PayPage params={{ paymentId: 'REF-004' }} />);

    const qrElement = await screen.findByTestId('qrcode');
    const uri = qrElement.getAttribute('data-value');

    const expectedUri =
      'web+stellar:pay?destination=&amount=60&memo=MEMO-NO-ADDR&memo_type=text';
    expect(uri).toBe(expectedUri);
  });
});
