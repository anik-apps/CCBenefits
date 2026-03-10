import { getIssuerColor } from '../constants/issuerTheme';

interface Props {
  issuer: string;
  size?: 'small' | 'medium';
}

export default function CardIcon({ issuer, size = 'medium' }: Props) {
  const { bg, text } = getIssuerColor(issuer);
  const initials = issuer.split(' ').map(w => w[0] || '').join('');
  const isSmall = size === 'small';

  return (
    <div style={{
      width: isSmall ? 40 : 48,
      height: isSmall ? 28 : 32,
      borderRadius: isSmall ? 5 : 6,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isSmall ? 10 : 11,
      fontWeight: 700,
      color: text,
      letterSpacing: 0.5,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}
