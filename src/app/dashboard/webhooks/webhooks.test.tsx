import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebhooksPage from '@/app/dashboard/webhooks/page';
import { webhooksApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  webhooksApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    rotateSecret: vi.fn(),
  },
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('WebhooksPage (#405)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webhooksApi.list).mockResolvedValue({
      data: [
        {
          id: 'wh_1',
          url: 'https://example.com/webhook',
          events: ['payment.created'],
          secret: 'whsec_testsecret123456',
          createdAt: '2026-09-25T10:00:00Z',
        },
      ],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders webhooks list from API', async () => {
    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
      expect(screen.getByText('payment.created')).toBeInTheDocument();
    });
  });

  it('opens create modal when Add Webhook is clicked', async () => {
    render(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('new-webhook-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Endpoint URL/i)).toBeInTheDocument();
  });

  it('shows error toast and inline error message when submitted with no events selected (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });

    // Initially no error is rendered
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();

    const submitBtn = screen.getByTestId('webhook-submit-button');
    fireEvent.click(submitBtn);

    // Assert toast error and inline error banner are both active
    expect(mockToastError).toHaveBeenCalledWith('Select at least one event');
    const inlineError = screen.getByTestId('webhook-events-error');
    expect(inlineError).toBeInTheDocument();
    expect(inlineError).toHaveTextContent('Select at least one event');
    expect(webhooksApi.create).not.toHaveBeenCalled();
  });

  it('clears inline error immediately when user checks an event checkbox (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });

    // Trigger validation error
    fireEvent.click(screen.getByTestId('webhook-submit-button'));
    expect(screen.getByTestId('webhook-events-error')).toBeInTheDocument();

    // Check the first event checkbox (e.g. payment.created)
    const eventCheckbox = screen.getByLabelText(/payment\.created/i);
    fireEvent.click(eventCheckbox);

    // Verify formError is cleared immediately on event check
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();
  });

  it('successfully creates webhook when URL and event are provided', async () => {
    vi.mocked(webhooksApi.create).mockResolvedValueOnce({
      data: {
        id: 'wh_2',
        url: 'https://myapi.com/callback',
        events: ['payment.created'],
        secret: 'whsec_generated987',
        createdAt: '2026-09-25T11:00:00Z',
      },
    } as any);

    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });
    fireEvent.click(screen.getByLabelText(/payment\.created/i));

    fireEvent.click(screen.getByTestId('webhook-submit-button'));

    await waitFor(() => {
      expect(webhooksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://myapi.com/callback',
          events: ['payment.created'],
        }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Webhook created');
    });
  });

  it('resets formError when modal is closed (#405)', async () => {
    render(<WebhooksPage />);

    fireEvent.click(screen.getByTestId('new-webhook-button'));

    const urlInput = screen.getByLabelText(/Endpoint URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://myapi.com/callback' } });
    fireEvent.click(screen.getByTestId('webhook-submit-button'));
    expect(screen.getByTestId('webhook-events-error')).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);

    // Reopen modal and verify error is gone
    fireEvent.click(screen.getByTestId('new-webhook-button'));
    expect(screen.queryByTestId('webhook-events-error')).not.toBeInTheDocument();
  });
});
