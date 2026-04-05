import { CATEGORY_ICONS, CATEGORY_COLORS, getCategoryIcon, getCategoryColor } from '../categoryTheme';

describe('categoryTheme', () => {
  it('has matching keys in CATEGORY_ICONS and CATEGORY_COLORS', () => {
    const iconKeys = Object.keys(CATEGORY_ICONS).sort();
    const colorKeys = Object.keys(CATEGORY_COLORS).sort();
    expect(iconKeys).toEqual(colorKeys);
  });

  it('all color values are valid hex strings', () => {
    Object.values(CATEGORY_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('getCategoryIcon returns fallback for unknown category', () => {
    expect(getCategoryIcon('travel')).toBe('✈️');
    expect(getCategoryIcon('nonexistent')).toBe('•');
  });

  it('getCategoryColor returns fallback for unknown category', () => {
    expect(getCategoryColor('dining')).toBe('#f59e0b');
    expect(getCategoryColor('nonexistent')).toBe('#64748b');
  });
});
