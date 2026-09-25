import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAdmin } from './auth';
import axios from 'axios';
import { useAuthStore } from './store';

vi.mock('./env', () => ({
  getApiUrl: vi.fn(() => 'http://localhost:3000/api/v1'),
}));

vi.mock('./auth-redirect', () => ({
  redirectToLogin: vi.fn(),
  setAuthRedirectHandler: vi.fn(),
}));

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

describe('auth token single source of truth', () => {
  let requestInterceptor: ((config: { headers: Record<string, string> }) => { headers: Record<string, string> }) | undefined;
  let responseInterceptor: ((err: { response?: { status: number } }) => Promise<never>) | undefined;

  beforeAll(async () => {
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    requestInterceptor = vi.mocked(instance.interceptors.request.use).mock.calls[0]?.[0];
    responseInterceptor = vi.mocked(instance.interceptors.response.use).mock.calls[0]?.[1];
  });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, merchant: null });
  });

  it('does not write a separate access_token localStorage key on setAuth', () => {
    useAuthStore.getState().setAuth('test-token', {
      id: '1',
      email: 'a@b.com',
      businessName: 'Acme',
      status: 'active',
    });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(useAuthStore.getState().token).toBe('test-token');
    expect(JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}').state.token).toBe('test-token');
  });

  it('clears legacy access_token key on logout', () => {
    localStorage.setItem('access_token', 'stale-token');
    useAuthStore.setState({
      token: 'live-token',
      merchant: { id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' },
    });

    useAuthStore.getState().logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('reads the bearer token from the auth store in the request interceptor', () => {
    useAuthStore.setState({ token: 'store-token', merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    expect(result?.headers.Authorization).toBe('Bearer store-token');
  });

  it('omits Authorization when the auth store has no token', () => {
    useAuthStore.setState({ token: null, merchant: null });

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor?.(config);

    expect(result?.headers.Authorization).toBeUndefined();
  });

  it('calls store logout on 401 responses instead of touching a legacy key', async () => {
    useAuthStore.setState({
      token: 'expired-token',
      merchant: { id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' },
    });
    localStorage.setItem('access_token', 'legacy-should-not-matter');

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    await expect(responseInterceptor?.({ response: { status: 401 } })).rejects.toEqual({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});

describe('isAdmin', () => {
  it('returns true when merchant role is "admin"', () => {
    expect(
      isAdmin({ id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active', role: 'admin' }),
    ).toBe(true);
  });

  it('returns true when merchant role is "staff"', () => {
    expect(
      isAdmin({ id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active', role: 'staff' }),
    ).toBe(true);
  });

  it('returns false when merchant role is "merchant"', () => {
    expect(
      isAdmin({ id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active', role: 'merchant' }),
    ).toBe(false);
  });

  it('returns false when merchant role is undefined', () => {
    expect(
      isAdmin({ id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' }),
    ).toBe(false);
  });

  it('returns false when merchant is null', () => {
    expect(isAdmin(null)).toBe(false);
  });
});
