import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { extractApiError } from '../utils/apiError';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={authPageStyle}>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Invalid Reset Link</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          This reset link is invalid. Please request a new one.
        </p>
        <Link to="/forgot-password" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
          Request new reset link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password.length > 72) {
      setError('Password must be at most 72 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(extractApiError(err, 'Invalid or expired reset link'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={authPageStyle}>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Password Reset</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Your password has been reset successfully.
        </p>
        <Link to="/login" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={authPageStyle}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Reset Password</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Enter your new password.
      </p>
      {error && <div style={errorStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>New Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={labelStyle}>Confirm Password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
        </label>
        <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: '100%', padding: '10px', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Back to sign in</Link>
      </p>
    </div>
  );
}
