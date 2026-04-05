import '@testing-library/react-native/build/matchers/extend-expect';

// Silence console.error for expected test warnings (act warnings, etc.)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
