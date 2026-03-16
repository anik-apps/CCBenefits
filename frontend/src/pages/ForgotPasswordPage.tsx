import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';
import { extractApiError } from '../utils/apiError';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={authPageStyle}>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Check Your Email</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          If that email is registered, a reset link has been sent. Check your inbox and click the link to reset your password.
        </p>
        <Link to="/login" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={authPageStyle}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Forgot Password</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Enter your email and we'll send you a reset link.
      </p>
      {error && <div style={errorStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </label>
        <button type="submit" disabled={loading || !email.trim()} style={{ ...primaryButtonStyle, width: '100%', padding: '10px', opacity: loading || !email.trim() ? 0.6 : 1 }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Back to sign in</Link>
      </p>
    </div>
  );
}
