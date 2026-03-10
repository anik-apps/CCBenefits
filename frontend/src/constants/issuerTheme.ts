export const ISSUER_COLORS: Record<string, { bg: string; text: string }> = {
  'American Express': { bg: '#006FCF', text: '#FFFFFF' },
  'Chase': { bg: '#0A3D8F', text: '#FFFFFF' },
  'Capital One': { bg: '#D03027', text: '#FFFFFF' },
  'Citi': { bg: '#003B70', text: '#FFFFFF' },
  'Bilt': { bg: '#1A1A2E', text: '#C9A84C' },
  'Bank of America': { bg: '#DC1431', text: '#FFFFFF' },
};

export const ISSUER_GRADIENTS: Record<string, string> = {
  'American Express': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'Chase': 'linear-gradient(135deg, #1a1a2e 0%, #1a2332 50%, #003087 100%)',
  'Citi': 'linear-gradient(135deg, #1a1a2e 0%, #1e2a3a 50%, #003b70 100%)',
  'Bilt': 'linear-gradient(135deg, #1a1a2e 0%, #2a1a2e 50%, #4a1942 100%)',
  'Capital One': 'linear-gradient(135deg, #1a1a2e 0%, #1a2a1e 50%, #1a4a2e 100%)',
  'Bank of America': 'linear-gradient(135deg, #1a1a2e 0%, #2e1a1a 50%, #5a1a1a 100%)',
};

export function getIssuerColor(issuer: string): { bg: string; text: string } {
  return ISSUER_COLORS[issuer] || { bg: '#3a3a4a', text: '#FFFFFF' };
}

export function getIssuerGradient(issuer: string): string {
  return ISSUER_GRADIENTS[issuer] || ISSUER_GRADIENTS['Chase'];
}
