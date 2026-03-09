import { useEffect, useState } from 'react';
import { getAdminFeedback } from '../services/api';
import type { FeedbackItem } from '../services/api';

const CATEGORY_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  general: 'General',
};

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminFeedback()
      .then(setFeedback)
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError('Admin access required');
        } else {
          setError('Failed to load feedback');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: 'var(--status-danger)' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>
        Feedback ({feedback.length})
      </h1>

      {feedback.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No feedback yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedback.map((fb) => (
            <div
              key={fb.id}
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {fb.user_email}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: fb.category === 'bug_report'
                    ? 'rgba(239,68,68,0.15)'
                    : fb.category === 'feature_request'
                    ? 'rgba(59,130,246,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  color: fb.category === 'bug_report'
                    ? '#ef4444'
                    : fb.category === 'feature_request'
                    ? '#3b82f6'
                    : 'var(--text-muted)',
                }}>
                  {CATEGORY_LABELS[fb.category] || fb.category}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{fb.message}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {new Date(fb.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
