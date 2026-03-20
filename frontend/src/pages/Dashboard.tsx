import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserCards } from '../services/api';
import CardSummary from '../components/CardSummary';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import LoadingSpinner from '../components/LoadingSpinner';
import YearPicker from '../components/YearPicker';
import PastYearBanner from '../components/PastYearBanner';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: cards, isLoading, isError } = useQuery({
    queryKey: ['user-cards', year],
    queryFn: () => getUserCards(year),
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    );
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
          width: 80, height: 80, borderRadius: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 20,
        }}>
          💳
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>
          No cards yet
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 320 }}>
          Add a credit card to start tracking your benefits and maximizing your returns.
        </p>
        <Link to="/add-card" style={{
          padding: '12px 28px', borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
          color: '#0a0a0f', fontWeight: 600, fontSize: '0.95rem',
        }}>
          Add Your First Card
        </Link>
      </div>
    );
  }

  const totalFees = cards.reduce((s, c) => s + c.annual_fee, 0);
  const totalUsed = cards.reduce((s, c) => s + c.ytd_actual_used, 0);
  const totalMax = cards.reduce((s, c) => s + c.total_max_annual_value, 0);
  const barData = cards.map((c) => ({
    label: c.nickname || c.card_name,
    value: c.utilization_pct,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600,
            animation: 'fadeInUp 0.4s ease-out both',
          }}>
            Your Cards
          </h1>
          <YearPicker selectedYear={year} onChange={setYear} />
        </div>
        <Link to="/credits" className="mobile-credits-btn" style={{
          padding: '8px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
          color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
        }}>
          All Credits →
        </Link>
      </div>

      <PastYearBanner year={year} />

      {/* Charts at top */}
      {totalMax > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
          animation: 'fadeInUp 0.4s ease-out both',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: 8 }}>
              Overall Utilization
            </h3>
            <DonutChart used={totalUsed} total={totalMax} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              ${totalUsed.toLocaleString()} of ${totalMax.toLocaleString()} used
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
              Annual fees: ${totalFees.toLocaleString()}
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', padding: 24,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: 8 }}>
              Per-Card Utilization
            </h3>
            <BarChart data={barData} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {cards.map((card, i) => (
          <CardSummary key={card.id} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
