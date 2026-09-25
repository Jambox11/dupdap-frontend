import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from './store';

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

vi.mock('./auth-redirect', () => ({
  redirectToLogin: vi.fn(),
}));

vi.mock('./env', () => ({
  getApiUrl: vi.fn(() => 'http://localhost:3000/api/v1'),
}));

describe('Axios 401 response interceptor', () => {
  let responseErrorHandler: ((err: { response?: { status: number } }) => Promise<never>) | undefined;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
    (globalThis as unknown as { getApiUrl: () => string }).getApiUrl = () => 'http://localhost:3000/api/v1';
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    responseErrorHandler = vi.mocked(instance.interceptors.response.use).mock.calls[0]?.[1];
  });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      token: 'some-token',
      merchant: { id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' },
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        pathname: '/dashboard',
        search: '',
        assign: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('clears auth state on a 401 response', async () => {
    const err = { response: { status: 401 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().merchant).toBeNull();
  });

  it('removes the legacy access_token from localStorage on 401', async () => {
    localStorage.setItem('access_token', 'legacy-token');

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('calls redirectToLogin() with the current path preserved on a 401 response', async () => {
    const { redirectToLogin } = await import('./auth-redirect');
    vi.mocked(redirectToLogin).mockClear();

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(redirectToLogin).toHaveBeenCalledWith('/dashboard');
  });

  it('invokes registered auth redirect handler when present on 401', async () => {
    const { setAuthRedirectHandler } = await import('./auth-redirect');
    const mockHandler = vi.fn();
    setAuthRedirectHandler(mockHandler);

    const err = { response: { status: 401 

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(redirectToLogin).toHaveBeenCalled();
    expect(window.location.href).not.toBe('/auth/login');
  });

  it('invokes registered auth redirect handler when present on 401', async () => {
    const { setAuthRedirectHandler } = await import('./auth-redirect');
    const mockHandler = vi.fn();
    setAuthRedirectHandler(mockHandler);

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(mockHandler).toHaveBeenCalledWith('/dashboard');
    setAuthRedirectHandler(null);
  });

  it('does not clear auth state on a non-401 error (e.g. 403)', async () => {
    const err = { response: { status: 403 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().token).toBe('some-token');
  });

  it('does not redirect on a non-401 error (e.g. 500)', async () => {
    const err = { response: { status: 500 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('passes through the original error on rejection for 401', async () => {
    const err = { response: { status: 401 }, message: 'Unauthorized' };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);
  });

  it('passes through the original error on rejection for non-401', async () => {
    const err = { response: { status: 404 }, message: 'Not Found' };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);
  });

  it('handles errors with no response property gracefully', async () => {
    const err = {} as { response?: { status: number } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    // Should not clear auth since there is no 401 status
    expect(useAuthStore.getState().token).toBe('some-token');
  });

  it('handles concurrent in-flight 401 responses safely and idempotently', async () => {
    localStorage.setItem('access_token', 'legacy-token');
    const err1 = { response: { status: 401 }, message: 'Unauthorized 1' };
    const err2 = { response: { status: 401 }, message: 'Unauthorized 2' };

    const results = await Promise.allSettled([
      responseErrorHandler?.(err1),
      responseErrorHandler?.(err2),
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect((results[0] as PromiseRejectedResult).reason).toEqual(err1);
    expect((results[1] as PromiseRejectedResult).reason).toEqual(err2);

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().merchant).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(window.location.href).toBe('/auth/login');
  });
});
