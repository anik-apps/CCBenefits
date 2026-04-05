import { extractApiError } from '../apiError';
import axios, { AxiosError } from 'axios';

describe('extractApiError', () => {
  it('extracts detail from an AxiosError response', () => {
    const err = new AxiosError('Request failed', '400', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as any,
      data: { detail: 'Email already registered' },
    });
    expect(extractApiError(err)).toBe('Email already registered');
  });

  it('falls back to AxiosError message when no detail', () => {
    const err = new AxiosError('Network Error');
    expect(extractApiError(err)).toBe('Network Error');
  });

  it('extracts message from a generic Error', () => {
    const err = new Error('Something broke');
    expect(extractApiError(err)).toBe('Something broke');
  });

  it('returns fallback for non-Error values', () => {
    expect(extractApiError('string error')).toBe('An unexpected error occurred');
    expect(extractApiError(null, 'Custom fallback')).toBe('Custom fallback');
  });
});
