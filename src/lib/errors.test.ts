import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('extracts message from AxiosError response data message', () => {
    const error = new AxiosError('Request failed with status code 400');
    error.response = {
      data: { message: 'Invalid credentials provided' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    expect(getErrorMessage(error)).toBe('Invalid credentials provided');
  });

  it('falls back to AxiosError message if response data has no message', () => {
    const error = new AxiosError('Network Error');
    error.response = {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    expect(getErrorMessage(error)).toBe('Network Error');
  });

  it('falls back to AxiosError message if response is undefined', () => {
    const error = new AxiosError('Connection refused');
    expect(getErrorMessage(error)).toBe('Connection refused');
  });

  it('extracts message from a standard Error instance', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('returns undefined for a standard Error with an empty message', () => {
    const error = new Error('');
    expect(getErrorMessage(error)).toBeUndefined();
  });

  it('returns undefined for non-Error thrown objects', () => {
    expect(getErrorMessage({ message: 'Fake error' })).toBeUndefined();
    expect(getErrorMessage({ error: 'Failed' })).toBeUndefined();
  });

  it('returns undefined for primitives and nullish values', () => {
    expect(getErrorMessage(null)).toBeUndefined();
    expect(getErrorMessage(undefined)).toBeUndefined();
    expect(getErrorMessage('error string')).toBeUndefined();
    expect(getErrorMessage(12345)).toBeUndefined();
    expect(getErrorMessage(false)).toBeUndefined();
  });
});
