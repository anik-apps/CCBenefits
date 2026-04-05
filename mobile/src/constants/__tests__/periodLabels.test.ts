import { PERIOD_ORDER, PERIOD_LABELS } from '../periodLabels';

describe('periodLabels', () => {
  it('PERIOD_ORDER contains all expected period types', () => {
    expect(PERIOD_ORDER).toEqual(['monthly', 'quarterly', 'semiannual', 'annual']);
  });

  it('PERIOD_LABELS has a label for every period in PERIOD_ORDER', () => {
    PERIOD_ORDER.forEach((period) => {
      expect(PERIOD_LABELS[period]).toBeDefined();
      expect(typeof PERIOD_LABELS[period]).toBe('string');
    });
  });
});
