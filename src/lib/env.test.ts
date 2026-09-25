import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getApiUrl } from './env';

describe('getApiUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns NEXT_PUBLIC_API_URL when explicitly set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.dupdap.io/v1';
    expect(getApiUrl()).toBe('https://api.dupdap.io/v1');
  });

  it('falls back to local development URL when NEXT_PUBLIC_API_URL is unset in development', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'development';
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
  });

  it('falls back to local development URL when NEXT_PUBLIC_API_URL is unset in test', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'test';
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
  });

  it('throws an error in production when NEXT_PUBLIC_API_URL is not configured', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';
    expect(() => getApiUrl()).toThrow('NEXT_PUBLIC_API_URL is not configured');
  });
});
