import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCardTemplates, createUserCard } from '../services/api';
import { primaryButtonStyle } from '../styles/form';
import CardIcon from '../components/CardIcon';
import { getIssuerColor, getIssuerGradient } from '../constants/issuerTheme';

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
          const ic = getIssuerColor(t.issuer);
          const gradient = getIssuerGradient(t.issuer);
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
              <div style={{ marginRight: 12 }}>
                <CardIcon issuer={t.issuer} />
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
