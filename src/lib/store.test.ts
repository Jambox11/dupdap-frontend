import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore, clearLegacyAccessTokenKey } from './store';
import type { Merchant } from './types';

const testMerchant: Merchant = {
  id: 'merchant-1',
  email: 'test@example.com',
  businessName: 'Test Business',
  status: 'active',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, merchant: null, hasHydrated: false });
  });

  describe('setAuth()', () => {
    it('updates the token in the store', () => {
      useAuthStore.getState().setAuth('my-token', testMerchant);
      expect(useAuthStore.getState().token).toBe('my-token');
    });

    it('updates the merchant in the store', () => {
      useAuthStore.getState().setAuth('my-token', testMerchant);
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
    });

    it('persists the token to localStorage under the dupdub-auth key', () => {
      useAuthStore.getState().setAuth('persisted-token', testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.token).toBe('persisted-token');
    });

    it('persists the merchant to localStorage under the dupdub-auth key', () => {
      useAuthStore.getState().setAuth('t', testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.merchant).toEqual(testMerchant);
    });

    it('removes the legacy access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'legacy');
      useAuthStore.getState().setAuth('new-token', testMerchant);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('logout()', () => {
    it('clears the token from the store', () => {
      useAuthStore.getState().setAuth('token', testMerchant);
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('clears the merchant from the store', () => {
      useAuthStore.getState().setAuth('token', testMerchant);
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().merchant).toBeNull();
    });

    it('persists the cleared state to localStorage', () => {
      useAuthStore.getState().setAuth('token', testMerchant);
      useAuthStore.getState().logout();
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.token).toBeNull();
      expect(stored.state.merchant).toBeNull();
    });

    it('removes the legacy access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'old-token');
      useAuthStore.getState().logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('persist middleware', () => {
    it('persists only token and merchant and does not serialize hasHydrated', () => {
      useAuthStore.getState().setAuth('survive-token', testMerchant);
      const stored = JSON.parse(localStorage.getItem('dupdub-auth') ?? '{}');
      expect(stored.state.token).toBe('survive-token');
      expect(stored.state.merchant).toEqual(testMerchant);
      expect(stored.state.hasHydrated).toBeUndefined();
    });

    it('sets hasHydrated to true upon rehydration from storage', async () => {
      useAuthStore.setState({ hasHydrated: false, token: null, merchant: null });
      localStorage.setItem(
        'dupdub-auth',
        JSON.stringify({ state: { token: 'persisted-token', merchant: testMerchant } }),
      );
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
      expect(useAuthStore.getState().token).toBe('persisted-token');
      expect(useAuthStore.getState().merchant).toEqual(testMerchant);
    });

    it('sets hasHydrated to true even when storage is empty', async () => {
      useAuthStore.setState({ hasHydrated: false, token: null, merchant: null });
      localStorage.clear();
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    it('sets hasHydrated to true upon rehydration', async () => {
      useAuthStore.setState({ hasHydrated: false });
      expect(useAuthStore.getState().hasHydrated).toBe(false);

      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    it('sets hasHydrated to true even when storage is empty (first visit)', async () => {
      localStorage.clear();
      useAuthStore.setState({ hasHydrated: false });
      expect(useAuthStore.getState().hasHydrated).toBe(false);

      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });
  });

  describe('clearLegacyAccessTokenKey()', () => {
    it('removes the access_token key from localStorage', () => {
      localStorage.setItem('access_token', 'legacy-value');
      clearLegacyAccessTokenKey();
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('does nothing when access_token key does not exist', () => {
      expect(() => clearLegacyAccessTokenKey()).not.toThrow();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});
