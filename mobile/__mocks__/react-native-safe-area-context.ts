import React from 'react';

export const useSafeAreaInsets = jest.fn().mockReturnValue({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  return children;
}
