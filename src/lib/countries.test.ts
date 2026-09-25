import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';

describe('countries integrity', () => {
  it('contains entries and has expected structure', () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
    for (const country of COUNTRIES) {
      expect(typeof country.code).toBe('string');
      expect(typeof country.name).toBe('string');
      expect(country.name.trim()).not.toBe('');
    }
  });

  it('contains valid ISO 3166-1 alpha-2 codes matching /^[A-Z]{2}$/', () => {
    const iso2Regex = /^[A-Z]{2}$/;
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(iso2Regex);
    }
  });

  it('has no duplicate country codes', () => {
    const seenCodes = new Set<string>();
    const duplicates: string[] = [];

    for (const country of COUNTRIES) {
      if (seenCodes.has(country.code)) {
        duplicates.push(country.code);
      }
      seenCodes.add(country.code);
    }

    expect(duplicates).toEqual([]);
    expect(seenCodes.size).toBe(COUNTRIES.length);
  });

  it('is sorted alphabetically by name according to localeCompare', () => {
    const names = COUNTRIES.map((c) => c.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);
  });
});
