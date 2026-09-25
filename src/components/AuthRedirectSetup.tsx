'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

/**
 * Redirects unauthenticated users to the login page, preserving the path they
 * were trying to reach via the `next` query param.
 */
export function AuthRedirectSetup() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) return;
    if (pathname.startsWith('/auth/login')) return;

    const returnPath = pathname;
    // Guard against open redirects: only forward same-origin, single-leading-slash
    // paths into the `next` param (mirrors the login page's consumption-time check).
    const safeNext = returnPath.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/dashboard';
    router.replace(`/auth/login?next=${encodeURIComponent(safeNext)}`);
  }, [isAuthenticated, pathname, router]);

  return null;
}
