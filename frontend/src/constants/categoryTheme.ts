export const CATEGORY_ICONS: Record<string, string> = {
  travel: '\u2708',
  dining: '\u{1F374}',
  entertainment: '\u{1F3AC}',
  shopping: '\u{1F6CD}',
  wellness: '\u{1F9D8}',
  lifestyle: '\u2728',
  membership: '\u{1F511}',
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

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#64748b';
}

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '\u2022';
}
