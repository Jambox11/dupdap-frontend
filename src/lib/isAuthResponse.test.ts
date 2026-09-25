import { describe, expect, it } from 'vitest';
import { isAuthResponse } from './types';

describe('isAuthResponse runtime type guard', () => {
  it('returns true for a minimal valid AuthResponse', () => {
    const valid = {
      accessToken: 'jwt-token-xyz',
      merchant: {
        id: 'merchant-123',
      },
    };
    expect(isAuthResponse(valid)).toBe(true);
  });

  it('returns true for a fully populated AuthResponse', () => {
    const valid = {
      accessToken: 'header.payload.signature',
      merchant: {
        id: 'merchant-456',
        email: 'test@example.com',
        businessName: 'Stellar Goods',
        status: 'active',
        role: 'merchant',
      },
    };
    expect(isAuthResponse(valid)).toBe(true);
  });

  it('returns false for null and undefined', () => {
    expect(isAuthResponse(null)).toBe(false);
    expect(isAuthResponse(undefined)).toBe(false);
  });

  it('returns false for primitive values', () => {
    expect(isAuthResponse('string')).toBe(false);
    expect(isAuthResponse(12345)).toBe(false);
    expect(isAuthResponse(true)).toBe(false);
    expect(isAuthResponse(false)).toBe(false);
    expect(isAuthResponse(Symbol('auth'))).toBe(false);
  });

  it('returns false when accessToken is missing or invalid', () => {
    expect(isAuthResponse({ merchant: { id: 'm-1' } })).toBe(false);
    expect(isAuthResponse({ accessToken: '', merchant: { id: 'm-1' } })).toBe(false);
    expect(isAuthResponse({ accessToken: 12345, merchant: { id: 'm-1' } })).toBe(false);
    expect(isAuthResponse({ accessToken: null, merchant: { id: 'm-1' } })).toBe(false);
    expect(isAuthResponse({ accessToken: undefined, merchant: { id: 'm-1' } })).toBe(false);
    expect(isAuthResponse({ accessToken: {}, merchant: { id: 'm-1' } })).toBe(false);
  });

  it('returns false when merchant is missing, null, or not an object', () => {
    expect(isAuthResponse({ accessToken: 'valid-token' })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: null })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: undefined })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: 'string-merchant' })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: 999 })).toBe(false);
  });

  it('returns false when merchant.id is missing, empty, or not a string', () => {
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: {} })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: { id: '' } })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: { id: null } })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: { id: undefined } })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: { id: 123 } })).toBe(false);
    expect(isAuthResponse({ accessToken: 'valid-token', merchant: { id: ['m-1'] } })).toBe(false);
  });
});
