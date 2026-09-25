const DEV_API_URL = 'http://localhost:3000/api/v1';

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return DEV_API_URL;
  }

  throw new Error('NEXT_PUBLIC_API_URL is not configured');
}
