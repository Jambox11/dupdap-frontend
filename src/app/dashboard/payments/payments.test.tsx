import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentsPage from '@/app/dashboard/payments/page';
import { paymentsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-svg" data-qr-value={value} />,
}));

describe('PaymentsPage — Description character limit and counter (#396)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentsApi.list).mockResolvedValue({
      data: {
        payments: [
          {
            id: 'pay_1',
            reference: 'PAY-001',
            amountUsd: 50,
            status: 'completed',
            createdAt: '2026-09-25T10:00:00Z',
          },
        ],
        total: 1,
      },
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders payments page and list', async () => {
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('PAY-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens create modal with description maxLength and character counter (#396)', async () => {
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('New Payment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Payment'));

    const descInput = screen.getByLabelText(/Description \(optional\)/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveAttribute('maxlength', '255');

    const counter = screen.getByTestId('description-char-counter');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveTextContent('0/255');
  });

  it('updates character counter as user types into description (#396)', async () => {
    render(<PaymentsPage />);

    fireEvent.click(screen.getByText('New Payment'));

    const descInput = screen.getByLabelText(/Description \(optional\)/i);
    fireEvent.change(descInput, { target: { value: 'Invoice #1042 for consultation' } });

    const counter = screen.getByTestId('description-char-counter');
    expect(counter).toHaveTextContent('30/255');
  });
});
