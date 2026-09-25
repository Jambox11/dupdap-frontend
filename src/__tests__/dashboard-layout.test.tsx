/**
 * Tests for /dashboard/layout.tsx auth guards and hydration lifecycle
 */
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// We control useAuthStore by mocking the whole store module
vi.mock('@/lib/store');

const mockUseAuthStore = vi.mocked(useAuthStore);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_MERCHANT = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Acme Corp',
  status: 'active',
};

function stubAuth(overrides: {
  token?: string | null;
  merchant?: typeof MOCK_MERCHANT | null;
  hasHydrated?: boolean;
}) {
  const state = {
    token: overrides.token ?? null,
    merchant: overrides.merchant ?? null,
    hasHydrated: overrides.hasHydrated ?? true,
    logout: vi.fn(),
    setAuth: vi.fn(),
    _setHasHydrated: vi.fn(),
  };
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (selector) return selector(state) as ReturnType<typeof useAuthStore>;
    return state as unknown as ReturnType<typeof useAuthStore>;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DashboardLayout — auth guards and hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('[pre-hydration window] renders loading spinner and avoids redirect or children render when hasHydrated is false', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT, hasHydrated: false });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // Pre-hydration loading spinner should be visible
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    // Children and sidebar should NOT render
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();

    // No premature redirect should occur
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[token + merchant] renders the dashboard shell and children when hydrated', async () => {
    stubAuth({ token: 'valid-token', merchant: MOCK_MERCHANT, hasHydrated: true });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // Children should be visible
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    // Merchant business name should appear in sidebar
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    // Should NOT redirect
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[token only, no merchant] returns null (blank render) — no redirect', async () => {
    stubAuth({ token: 'valid-token', merchant: null, hasHydrated: true });

    const { container } = render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // The layout returns null when merchant is missing
    expect(container.firstChild).toBeNull();
    // Children should NOT be rendered
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    // Should NOT redirect (token is present)
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('[no token, merchant present] redirects to /auth/login with next param', async () => {
    stubAuth({ token: null, merchant: MOCK_MERCHANT, hasHydrated: true });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    // The redirect is triggered in a useEffect — flush it
    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockPush).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard');
  });

  it('[no token, no merchant] redirects to /auth/login with next param', async () => {
    stubAuth({ token: null, merchant: null, hasHydrated: true });

    render(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>,
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockPush).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard');
  });
});
