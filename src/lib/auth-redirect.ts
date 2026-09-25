type AuthRedirectHandler = (returnPath?: string) => void;

let authRedirectHandler: AuthRedirectHandler | null = null;

export function setAuthRedirectHandler(handler: AuthRedirectHandler | null) {
  authRedirectHandler = handler;
}

function isSafeReturnPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth/login');
}

export function redirectToLogin(returnPath?: string) {
  const rawPath =
    returnPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : undefined);

  const path = rawPath && isSafeReturnPath(rawPath) ? rawPath : undefined;

  if (authRedirectHandler) {
    authRedirectHandler(path);
    return;
  }

  if (typeof window !== 'undefined') {
    const next = path ? `?next=${encodeURIComponent(path)}` : '';
    window.location.assign(`/auth/login${next}`);
  }
}
