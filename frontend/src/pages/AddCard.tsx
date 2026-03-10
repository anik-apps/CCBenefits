import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCardTemplates, createUserCard } from '../services/api';
import { primaryButtonStyle } from '../styles/form';

const ISSUER_GRADIENTS: Record<string, string> = {
  'American Express': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'Chase': 'linear-gradient(135deg, #1a1a2e 0%, #1a2332 50%, #003087 100%)',
  'Citi': 'linear-gradient(135deg, #1a1a2e 0%, #1e2a3a 50%, #003b70 100%)',
  'Bilt': 'linear-gradient(135deg, #1a1a2e 0%, #2a1a2e 50%, #4a1942 100%)',
  'Capital One': 'linear-gradient(135deg, #1a1a2e 0%, #1a2a1e 50%, #1a4a2e 100%)',
  'Bank of America': 'linear-gradient(135deg, #1a1a2e 0%, #2e1a1a 50%, #5a1a1a 100%)',
};

const ISSUER_COLORS: Record<string, { bg: string; text: string }> = {
  'American Express': { bg: '#006FCF', text: '#FFFFFF' },
  'Chase': { bg: '#0A3D8F', text: '#FFFFFF' },
  'Capital One': { bg: '#D03027', text: '#FFFFFF' },
  'Citi': { bg: '#003B70', text: '#FFFFFF' },
  'Bilt': { bg: '#1A1A2E', text: '#C9A84C' },
  'Bank of America': { bg: '#DC1431', text: '#FFFFFF' },
};

export default function AddCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['card-templates'],
    queryFn: getCardTemplates,
  });

  const handleAdd = async (templateId: number) => {
    setCreating(templateId);
    try {
      await createUserCard(templateId, nickname || undefined);
      await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
      navigate('/');
    } catch {
      setCreating(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border-medium)',
          borderTopColor: 'var(--accent-gold)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.6rem',
        fontWeight: 600,
        marginBottom: 8,
        animation: 'fadeInUp 0.4s ease-out both',
      }}>
        Add a Card
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: 24,
        fontSize: '0.9rem',
        animation: 'fadeInUp 0.4s ease-out 0.05s both',
      }}>
        Select a credit card to start tracking its benefits.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        {templates?.map((t, i) => {
          const ic = ISSUER_COLORS[t.issuer] || { bg: '#3a3a4a', text: '#FFFFFF' };
          const gradient = ISSUER_GRADIENTS[t.issuer] || ISSUER_GRADIENTS['Chase'];
          const initials = t.issuer.split(' ').map(w => w[0] || '').join('');
          return (
          <div key={t.id} style={{ animation: `fadeInUp 0.4s ease-out ${(i + 1) * 0.06}s both` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: expandedId === t.id ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                background: expandedId === t.id ? 'rgba(201, 168, 76, 0.08)' : gradient,
                border: `1px solid ${expandedId === t.id ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                borderBottom: expandedId === t.id ? 'none' : undefined,
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 48,
                height: 32,
                borderRadius: 6,
                background: ic.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: ic.text,
                letterSpacing: 0.5,
                flexShrink: 0,
                marginRight: 12,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t.issuer} &middot; {t.benefit_count} benefits &middot; Up to ${t.total_annual_value.toLocaleString()}/yr
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  ${t.annual_fee}/yr
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (expandedId === t.id) {
                      setExpandedId(null);
                      setNickname('');
                    } else {
                      setExpandedId(t.id);
                      setNickname('');
                    }
                  }}
                  style={{
                    ...primaryButtonStyle,
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                  }}
                >
                  {expandedId === t.id ? 'Cancel' : 'Add'}
                </button>
              </div>
            </div>

            {expandedId === t.id && (
              <div style={{
                padding: '14px 20px',
                background: 'rgba(201, 168, 76, 0.08)',
                border: '1.5px solid var(--accent-gold)',
                borderTop: 'none',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                animation: 'fadeInUp 0.2s ease-out both',
              }}>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Nickname (optional)"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(t.id); }}
                />
                <button
                  onClick={() => handleAdd(t.id)}
                  disabled={creating !== null}
                  style={{
                    ...primaryButtonStyle,
                    padding: '8px 20px',
                    opacity: creating === t.id ? 0.6 : 1,
                  }}
                >
                  {creating === t.id ? 'Adding...' : 'Add Card'}
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
