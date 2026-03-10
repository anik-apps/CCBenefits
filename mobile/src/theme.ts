// Dark theme matching the web frontend's CSS variables
export const colors = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  bgCard: '#14141e',
  textPrimary: '#e8e8ed',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b80',
  accentGold: '#c9a84c',
  accentGoldDim: '#a08630',
  borderSubtle: '#1e1e2a',
  borderMedium: '#2a2a3a',
  statusDanger: '#ef4444',
  statusSuccess: '#22c55e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
};

export const fonts = {
  regular: { fontSize: 14, color: colors.textPrimary },
  small: { fontSize: 12, color: colors.textMuted },
  heading: { fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
};
