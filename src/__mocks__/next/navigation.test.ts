import { describe, expect, it } from 'vitest';
import navigationDefault, { useRouter, usePathname, useSearchParams, redirect } from './navigation';

describe('next/navigation mock', () => {
  it('exports expected router and routing mock functions', () => {
    expect(typeof useRouter).toBe('function');
    expect(typeof usePathname).toBe('function');
    expect(typeof useSearchParams).toBe('function');
    expect(typeof redirect).toBe('function');

    const router = useRouter();
    expect(typeof router.push).toBe('function');
    expect(typeof router.replace).toBe('function');
    expect(typeof router.prefetch).toBe('function');
    expect(typeof router.back).toBe('function');

    expect(usePathname()).toBe('/dashboard');
    expect(useSearchParams()).toBeInstanceOf(URLSearchParams);

    expect(navigationDefault.useRouter).toBe(useRouter);
    expect(navigationDefault.usePathname).toBe(usePathname);
    expect(navigationDefault.useSearchParams).toBe(useSearchParams);
    expect(navigationDefault.redirect).toBe(redirect);
  });
});
