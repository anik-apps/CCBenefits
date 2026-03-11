import axios from 'axios';

export function extractApiError(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.detail || err.message;
  }
  return err instanceof Error ? err.message : fallback;
}
