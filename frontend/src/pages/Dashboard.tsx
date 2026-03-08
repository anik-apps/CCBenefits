import { useQuery } from '@tanstack/react-query';
import { getUserCards } from '../services/api';
import CardSummary from '../components/CardSummary';
import ROISummary from '../components/ROISummary';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: cards, isLoading, isError } = useQuery({
    queryKey: ['user-cards'],
    queryFn: getUserCards,
    refetchOnMount: 'always',
  });

  if (isError) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--accent-red)' }}>
        <p>Failed to load cards. Check that the backend is running on localhost:8000.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!cards || cards.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease-out both',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          marginBottom: 20,
        }}>
          💳
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: 8,
        }}>
          No cards yet
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 320 }}>
          Add a credit card to start tracking your benefits and maximizing your returns.
        </p>
        <Link to="/add-card" style={{
          padding: '12px 28px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
          color: '#0a0a0f',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}>
          Add Your First Card
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.6rem',
          fontWeight: 600,
          marginBottom: 20,
          animation: 'fadeInUp 0.4s ease-out both',
        }}>
          Your Cards
        </h1>
      </div>

      <ROISummary cards={cards} />

      <div style={{ display: 'grid', gap: 16 }}>
        {cards.map((card, i) => (
          <CardSummary key={card.id} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
