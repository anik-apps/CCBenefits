const listeners = new Set<(state: any) => void>();

export default {
  addEventListener: jest.fn((callback: (state: any) => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
};
