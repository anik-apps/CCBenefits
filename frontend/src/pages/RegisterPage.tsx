import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';
import { extractApiError } from '../utils/apiError';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/verify-pending');
    } catch (err: unknown) {
      setError(extractApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authPageStyle}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Create Account</h1>
      {error && <div style={errorStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Display Name</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={labelStyle}>Confirm Password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} style={inputStyle} />
        </label>
        <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: '100%', padding: '10px' }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Sign in</Link>
      </p>
    </div>
  );
}
