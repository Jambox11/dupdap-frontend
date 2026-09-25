import { vi } from 'vitest';

export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
}));

export const usePathname = vi.fn(() => '/dashboard');
export const useSearchParams = vi.fn(() => new URLSearchParams());
export const redirect = vi.fn();

export default { useRouter, usePathname, useSearchParams, redirect };
