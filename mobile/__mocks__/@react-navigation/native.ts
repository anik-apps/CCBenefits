import React from 'react';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();

export const useNavigation = jest.fn(() => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  reset: mockReset,
  addListener: jest.fn(() => jest.fn()),
}));

export const useRoute = jest.fn(() => ({
  params: {},
}));

export function NavigationContainer({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export const createNavigationContainerRef = jest.fn(() => ({
  current: {
    isReady: jest.fn(() => true),
    navigate: mockNavigate,
    goBack: mockGoBack,
  },
}));
