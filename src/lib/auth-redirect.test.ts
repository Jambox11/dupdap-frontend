import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirectToLogin, setAuthRedirectHandler } from './auth-redirect';

describe('redirectToLogin', () => {
  beforeEach(() => {
    setAuthRedirectHandler(null);
  });

  it('uses the registered client-side handler with the current path', () => {
    const handler = vi.fn();
    setAuthRedirectHandler(handler);

    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/webhooks', search: '?tab=1', assign: vi.fn() },
      writable: true,
    });

    redirectToLogin();

    expect(handler).toHaveBeenCalledWith('/dashboard/webhooks?tab=1');
  });

  it('falls back to a login URL with next when no handler is registered', () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/payments', search: '', assign },
      writable: true,
    });

    redirectToLogin('/dashboard/payments');

    expect(assign).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%2Fpayments');
  });

  it('falls back to window.location.assign when a previously registered handler is unregistered mid-flight', () => {
    const staleHandler = vi.fn();
    const assign = vi.fn();

    // 1. Register handler (e.g. AuthRedirectSetup mount)
    setAuthRedirectHandler(staleHandler);

    // 2. Unregister handler mid-flight (e.g. AuthRedirectSetup unmount cleanup)
    setAuthRedirectHandler(null);

    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/settlements', search: '?status=pending', assign },
      writable: true,
    });

    redirectToLogin();

    // Stale handler must not be invoked
    expect(staleHandler).not.toHaveBeenCalled();
    // Must fall back to window.location.assign with encoded return path
    expect(assign).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%2Fsettlements%3Fstatus%3Dpending');
  });
});
