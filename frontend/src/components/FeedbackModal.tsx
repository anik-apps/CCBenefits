import { useState, useEffect } from 'react';
import { submitFeedback } from '../services/api';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle } from '../styles/form';

const CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
];

const MAX_LENGTH = 1000;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCategory('general');
      setMessage('');
      setError('');
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await submitFeedback(category, message);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch {
      setError('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)', padding: 24,
          width: '100%', maxWidth: 440, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Send Feedback</h2>

        {success ? (
          <p style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>Thanks for your feedback!</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={errorStyle}>{error}</div>}

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={labelStyle}>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={labelStyle}>Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                required
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', float: 'right' }}>
                {message.length}/{MAX_LENGTH}
              </span>
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border-medium)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                style={{ ...primaryButtonStyle, padding: '8px 16px' }}
              >
                {loading ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
