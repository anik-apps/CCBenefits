import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCardTemplates, createUserCard } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AddCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['card-templates'],
    queryFn: getCardTemplates,
  });

  const handleCreate = async () => {
    if (!selectedId) return;
    setCreating(selectedId);
    setError(null);
    try {
      await createUserCard(selectedId, nickname || undefined);
      await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
      navigate('/');
    } catch {
      setError('Failed to add card. Please try again.');
      setCreating(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
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

      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        {templates?.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: selectedId === t.id ? 'rgba(201, 168, 76, 0.08)' : 'var(--bg-card)',
              border: `1.5px solid ${selectedId === t.id ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
              textAlign: 'left',
              transition: 'all 0.2s',
              animation: `fadeInUp 0.4s ease-out ${(i + 1) * 0.06}s both`,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t.issuer} &middot; {t.benefit_count} benefits &middot; Up to ${t.total_annual_value.toLocaleString()}/yr
              </div>
            </div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              flexShrink: 0,
              marginLeft: 16,
            }}>
              ${t.annual_fee}/yr
            </div>
          </button>
        ))}
      </div>

      {selectedId && (
        <div style={{
          animation: 'fadeInUp 0.3s ease-out both',
          padding: '20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Nickname (optional)
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. My Primary Card"
            style={{ width: '100%', marginBottom: 16 }}
          />
          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating !== null}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
              color: '#0a0a0f',
              fontWeight: 600,
              fontSize: '0.95rem',
              opacity: creating !== null ? 0.6 : 1,
            }}
          >
            {creating !== null ? 'Adding...' : 'Add Card'}
          </button>
        </div>
      )}
    </div>
  );
}
