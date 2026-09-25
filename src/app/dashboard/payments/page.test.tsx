import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import PaymentsPage from './page';
import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  paymentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code" />,
}));

const basePayment: Payment = {
  id: 'pay-1',
  reference: 'REF-001',
  amountUsd: 25,
  status: 'pending',
  stellarMemo: 'MEMO123',
  stellarDepositAddress: 'GABCDEF1234567890',
  qrCode: 'stellar:pay',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function mockListResponse(payments: Payment[], total: number) {
  vi.mocked(paymentsApi.list).mockResolvedValue({
    data: { payments, total },
  } as Awaited<ReturnType<typeof paymentsApi.list>>);
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListResponse([], 0);
  });

  afterEach(() => {
    cleanup();
  });

  it('disables Prev on page 1', async () => {
    mockListResponse([basePayment], 45);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    });
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
  });

  it('disables Next on the last page', async () => {
    mockListResponse([basePayment], 25);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('pagination-next'));

    await waitFor(() => {
      expect(paymentsApi.list).toHaveBeenCalledWith(2, 20);
    });

    await waitFor(() => {
      expect(screen.getByTestId('pagination-next')).toBeDisabled();
    });
    expect(screen.getByTestId('pagination-prev')).not.toBeDisabled();
  });

  it('exposes pagination controls in a labeled nav landmark with descriptive button labels', async () => {
    mockListResponse([basePayment], 45);

    render(<PaymentsPage />);

    const nav = await screen.findByRole('navigation', { name: 'Pagination' });
    const prev = within(nav).getByTestId('pagination-prev');
    const next = within(nav).getByTestId('pagination-next');

    expect(prev).toHaveAccessibleName(/page 1 of 3/i);
    expect(next).toHaveAccessibleName(/page 2 of 3/i);
  });

  it('updates the Next button label to reflect the target page', async () => {
    mockListResponse([basePayment], 45);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('pagination-next'));

    await waitFor(() => {
      expect(paymentsApi.list).toHaveBeenCalledWith(2, 20);
    });

    const next = screen.getByTestId('pagination-next');
    expect(next).toHaveAccessibleName(/page 3 of 3/i);
  });

  it('submits the create-payment form with parsed numeric fields', async () => {
    const user = userEvent.setup();
    const createdPayment = { ...basePayment, id: 'pay-new', reference: 'REF-NEW', amountUsd: 12.5 };
    vi.mocked(paymentsApi.create).mockResolvedValue({
      data: createdPayment,
    } as Awaited<ReturnType<typeof paymentsApi.create>>);

    render(<PaymentsPage />);

    await user.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    fireEvent.change(fields.getByLabelText('Amount (USD)'), { target: { value: '12.50' } });
    fireEvent.change(fields.getByLabelText('Description (optional)'), { target: { value: 'Test invoice' } });
    fireEvent.change(fields.getByLabelText('Customer Email (optional)'), { target: { value: 'buyer@example.com' } });
    fireEvent.change(fields.getByLabelText('Expires in (minutes)'), { target: { value: '60' } });
    await user.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(paymentsApi.create).toHaveBeenCalledWith({
        amountUsd: 12.5,
        description: 'Test invoice',
        customerEmail: 'buyer@example.com',
        expiryMinutes: 60,
      });
    });
  });

  it('rejects an out-of-range expiryMinutes before calling the API', async () => {
    render(<PaymentsPage />);

    await userEvent.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    await userEvent.type(fields.getByLabelText('Amount (USD)'), '10');
    await userEvent.clear(fields.getByLabelText('Expires in (minutes)'));
    await userEvent.type(fields.getByLabelText('Expires in (minutes)'), '2');
    await userEvent.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(paymentsApi.create).not.toHaveBeenCalled();
  });

  it('rejects an expiryMinutes above the upper bound before calling the API', async () => {
    render(<PaymentsPage />);

    await userEvent.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    await userEvent.type(fields.getByLabelText('Amount (USD)'), '10');
    await userEvent.clear(fields.getByLabelText('Expires in (minutes)'));
    await userEvent.type(fields.getByLabelText('Expires in (minutes)'), '1441');
    await userEvent.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(paymentsApi.create).not.toHaveBeenCalled();
  });

  it('clears the form and shows the QR modal after a successful create', async () => {
    const user = userEvent.setup();
    const createdPayment = { ...basePayment, id: 'pay-new', reference: 'REF-NEW' };
    vi.mocked(paymentsApi.create).mockResolvedValue({
      data: createdPayment,
    } as Awaited<ReturnType<typeof paymentsApi.create>>);

    render(<PaymentsPage />);

    await user.click(screen.getByTestId('new-payment-button'));

    const modal = await screen.findByTestId('create-payment-modal');
    const fields = within(modal);

    await user.type(fields.getByLabelText('Amount (USD)'), '10');
    await user.click(fields.getByTestId('create-payment-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('create-payment-modal')).not.toBeInTheDocument();
    });

    const qrModal = await screen.findByTestId('payment-qr-modal');
    expect(within(qrModal).getByText('REF-NEW')).toBeInTheDocument();
    expect(within(qrModal).getByTestId('qr-code')).toBeInTheDocument();

    await user.click(screen.getByTestId('new-payment-button'));
    const reopenedModal = await screen.findByTestId('create-payment-modal');
    expect((within(reopenedModal).getByLabelText('Amount (USD)') as HTMLInputElement).value).toBe('');
  });

  it('renders an error banner when paymentsApi.list rejects', async () => {
    vi.mocked(paymentsApi.list).mockRejectedValueOnce(new Error('Network error loading payments'));

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('payments-error')).toBeInTheDocument();
      expect(screen.getByTestId('payments-error')).toHaveTextContent('Network error loading payments');
    });

    expect(screen.queryByText('No payments yet')).not.toBeInTheDocument();
  });

  it('renders fallback error message when error object has no message property', async () => {
    vi.mocked(paymentsApi.list).mockRejectedValue({});

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('payments-error')).toBeInTheDocument();
      expect(screen.getByTestId('payments-error')).toHaveTextContent('Network error loading payments');
    });
    expect(screen.queryByText('No payments yet')).not.toBeInTheDocument();
  });

  it('renders fallback error message when error has no specific message', async () => {
    vi.mocked(paymentsApi.list).mockRejectedValueOnce({});

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('payments-error')).toBeInTheDocument();
      expect(screen.getByTestId('payments-error')).toHaveTextContent("Couldn't load payments.");
    });
    expect(screen.queryByText('No payments yet')).not.toBeInTheDocument();
  });

  it('resets the copy-success state when a different payment is selected', async () => {
    const paymentA: Payment = { ...basePayment, id: 'pay-a', reference: 'REF-A', stellarMemo: 'MEMO-A' };
    const paymentB: Payment = { ...basePayment, id: 'pay-b', reference: 'REF-B', stellarMemo: 'MEMO-B' };
    mockListResponse([paymentA, paymentB], 2);

    render(<PaymentsPage />);

    const qrButtons = await screen.findAllByTestId('view-qr-button');

    await userEvent.click(qrButtons[0]);
    const modalA = await screen.findByTestId('payment-qr-modal');
    await userEvent.click(within(modalA).getByTestId('copy-memo-button'));
    expect(within(modalA).getByTestId('copy-memo-button')).toHaveAttribute('data-copied', 'true');

    await userEvent.click(within(modalA).getByTestId('payment-qr-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('payment-qr-modal')).not.toBeInTheDocument();
    });

    await userEvent.click(qrButtons[1]);
    const modalB = await screen.findByTestId('payment-qr-modal');
    expect(within(modalB).getByTestId('copy-memo-button')).toHaveAttribute('data-copied', 'false');
  });
});
