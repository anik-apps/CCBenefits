export const ISSUER_COLORS: Record<string, { bg: string; text: string }> = {
  'American Express': { bg: '#006FCF', text: '#FFFFFF' },
  'Chase': { bg: '#0A3D8F', text: '#FFFFFF' },
  'Capital One': { bg: '#D03027', text: '#FFFFFF' },
  'Citi': { bg: '#003B70', text: '#FFFFFF' },
  'Bilt': { bg: '#1A1A2E', text: '#C9A84C' },
  'Bank of America': { bg: '#DC1431', text: '#FFFFFF' },
};

export const ISSUER_GRADIENTS: Record<string, string> = {
  'American Express': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(22,33,62,0.80) 50%, rgba(15,52,96,0.80) 100%)',
  'Chase': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(26,35,50,0.80) 50%, rgba(0,48,135,0.80) 100%)',
  'Citi': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(30,42,58,0.80) 50%, rgba(0,59,112,0.80) 100%)',
  'Bilt': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(42,26,46,0.80) 50%, rgba(74,25,66,0.80) 100%)',
  'Capital One': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(26,42,30,0.80) 50%, rgba(26,74,46,0.80) 100%)',
  'Bank of America': 'linear-gradient(135deg, rgba(26,26,46,0.80) 0%, rgba(46,26,26,0.80) 50%, rgba(90,26,26,0.80) 100%)',
};

export function getIssuerColor(issuer: string): { bg: string; text: string } {
  return ISSUER_COLORS[issuer] || { bg: '#3a3a4a', text: '#FFFFFF' };
}

export function getIssuerGradient(issuer: string): string {
  return ISSUER_GRADIENTS[issuer] || ISSUER_GRADIENTS['Chase'];
}
