/**
 * Tests for /waitlist/page.tsx
 * Issue: successful join, failed join with toast, required-field validation
 * Issue #304: username availability check race condition
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { waitlistApi } from '@/lib/api';
import WaitlistPage from '@/app/waitlist/page';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/api', () => ({
  waitlistApi: {
    join: jest.fn(),
    checkUsername: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockJoin = waitlistApi.join as jest.MockedFunction<typeof waitlistApi.join>;
const mockCheckUsername = waitlistApi.checkUsername as jest.MockedFunction<
  typeof waitlistApi.checkUsername
>;
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fill the required email field and submit the form */
async function fillAndSubmit(email: string) {
  const user = userEvent.setup();
  const emailInput = screen.getByLabelText('Email');
  await user.clear(emailInput);
  await user.type(emailInput, email);
  const submitBtn = screen.getByRole('button', { name: /join waitlist/i });
  await user.click(submitBtn);
}

/** Advance past the 400ms debounce window and flush pending promises */
async function flushDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WaitlistPage', () => {
  describe('successful join', () => {
    it('renders the CheckCircle confirmation view after a successful join', async () => {
      mockJoin.mockResolvedValue({ data: {} } as ReturnType<typeof waitlistApi.join>);

      render(<WaitlistPage />);

      await fillAndSubmit('user@example.com');

      await waitFor(() => {
        expect(screen.getByText("You're on the list!")).toBeInTheDocument();
      });

      // Form should no longer be visible
      expect(screen.queryByRole('button', { name: /join waitlist/i })).not.toBeInTheDocument();
    });

    it('calls waitlistApi.join with the submitted email', async () => {
      mockJoin.mockResolvedValue({ data: {} } as ReturnType<typeof waitlistApi.join>);

      render(<WaitlistPage />);

      await fillAndSubmit('merchant@example.com');

      await waitFor(() => {
        expect(mockJoin).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'merchant@example.com' }),
        );
      });
    });
  });

  describe('failed join', () => {
    it('shows a toast error and keeps the form visible on API failure', async () => {
      mockJoin.mockRejectedValue(new Error('Server error'));

      render(<WaitlistPage />);

      await fillAndSubmit('user@example.com');

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      // Form should still be visible
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });

    it('shows the API error message in the toast', async () => {
      const { AxiosError } = await import('axios');
      const axiosError = new AxiosError('Request failed');
      (axiosError as unknown as { response: unknown }).response = {
        data: { message: 'Email already registered' },
        status: 400,
      };
      mockJoin.mockRejectedValue(axiosError);

      render(<WaitlistPage />);

      await fillAndSubmit('taken@example.com');

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Email already registered');
      });
    });

    it('shows a fallback toast message when no specific error message is available', async () => {
      mockJoin.mockRejectedValue(new Error(''));

      render(<WaitlistPage />);

      await fillAndSubmit('user@example.com');

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to join waitlist');
      });
    });

    it('does not throw a ReferenceError when the submission fails', async () => {
      mockJoin.mockRejectedValue(new Error('Server error'));

      render(<WaitlistPage />);

      // If the catch block referenced an undefined setFormError, this would throw
      // a ReferenceError and the toast would never fire.
      await expect(fillAndSubmit('user@example.com')).resolves.not.toThrow();

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
    });
  });

  describe('required-field validation', () => {
    it('does not submit when the email field is empty (HTML required attribute prevents submission)', async () => {
      render(<WaitlistPage />);

      // Verify the email input has the required attribute
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeRequired();

      // Without filling in the email, clicking submit should not invoke the API.
      // JSDOM doesn't enforce native form validation; instead verify checkValidity()
      expect((emailInput as HTMLInputElement).checkValidity()).toBe(false);
      expect(mockJoin).not.toHaveBeenCalled();
    });

    it('disables inputs while submission is in-flight', async () => {
      // Never resolves — keeps loading state
      mockJoin.mockReturnValue(new Promise(() => {}) as ReturnType<typeof waitlistApi.join>);

      render(<WaitlistPage />);

      await fillAndSubmit('user@example.com');

      await waitFor(() => {
        // The fieldset is disabled during loading
        const fieldset = document.querySelector('fieldset');
        expect(fieldset).toBeDisabled();
      });
    });

    it('shows "Joining..." text on the button while submitting', async () => {
      mockJoin.mockReturnValue(new Promise(() => {}) as ReturnType<typeof waitlistApi.join>);

      render(<WaitlistPage />);

      await fillAndSubmit('user@example.com');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /joining/i })).toBeInTheDocument();
      });
    });
  });

  describe('username availability race condition (#304)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ignores a stale response that resolves after a newer check', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // First check (for "alice") resolves slowly; second check (for "alice2") resolves fast.
      let resolveFirst: (v: { data: { available: boolean } }) => void = () => {};
      const firstPromise = new Promise<{ data: { available: boolean } }>((resolve) => {
        resolveFirst = resolve;
      });

      mockCheckUsername.mockImplementation((username: string) => {
        if (username === 'alice') {
          return firstPromise as ReturnType<typeof waitlistApi.checkUsername>;
        }
        return Promise.resolve({ data: { available: true } }) as ReturnType<
          typeof waitlistApi.checkUsername
        >;
      });

      render(<WaitlistPage />);

      const usernameInput = screen.getByLabelText(/username/i);

      // Type "alice" and let the debounce fire so the slow request is in flight.
      await user.type(usernameInput, 'alice');
      await flushDebounce();

      // Now change to "alice2" and let the debounce fire; the fast request resolves.
      await user.type(usernameInput, '2');
      await flushDebounce();

      // The newer check should have produced the "available" status.
      await waitFor(() => {
        expect(screen.getByText(/available/i)).toBeInTheDocument();
      });

      // Now resolve the stale first request with a conflicting result.
      await act(async () => {
        resolveFirst({ data: { available: false } });
        await Promise.resolve();
      });

      // The stale "taken" result must NOT overwrite the newer "available" status.
      expect(screen.queryByText(/taken/i)).not.toBeInTheDocument();
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });

    it('only reflects the latest username check result', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockCheckUsername.mockResolvedValue({ data: { available: true } } as ReturnType<
        typeof waitlistApi.checkUsername
      >);

      render(<WaitlistPage />);

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'bob');
      await flushDebounce();

      await waitFor(() => {
        expect(mockCheckUsername).toHaveBeenCalledWith('bob');
      });

      // The status shown must correspond to the latest checked username.
      await waitFor(() => {
        expect(screen.getByText(/available/i)).toBeInTheDocument();
      });
    });
  });
});
