import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import { AppReadyProvider } from '../contexts/AppReadyContext';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(
  ui: React.ReactElement,
  options?: { queryClient?: QueryClient; appReady?: boolean },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const appReady = options?.appReady ?? true;
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AppReadyProvider, { value: appReady }, children),
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), queryClient };
}

function renderHookWithProviders<T>(
  hook: () => T,
  options?: { queryClient?: QueryClient; appReady?: boolean },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const appReady = options?.appReady ?? true;
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AppReadyProvider, { value: appReady }, children),
    );
  }
  return { ...renderHook(hook, { wrapper: Wrapper }), queryClient };
}

export { createTestQueryClient, renderWithProviders, renderHookWithProviders, render, renderHook };
