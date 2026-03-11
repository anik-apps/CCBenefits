export const CATEGORY_ICONS: Record<string, string> = {
  travel: '\u2708\uFE0F',
  dining: '\uD83C\uDF74',
  entertainment: '\uD83C\uDFAC',
  shopping: '\uD83D\uDECD\uFE0F',
  wellness: '\uD83E\uDDD8',
  lifestyle: '\u2728',
  membership: '\uD83D\uDD11',
};

export const CATEGORY_COLORS: Record<string, string> = {
  travel: '#3b82f6',
  dining: '#f59e0b',
  entertainment: '#a855f7',
  shopping: '#ec4899',
  wellness: '#10b981',
  lifestyle: '#6366f1',
  membership: '#64748b',
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '\u2022';
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#64748b';
}
