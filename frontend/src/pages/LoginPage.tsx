import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { storeTokens } from '../services/api';
import { extractApiError } from '../utils/apiError';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';

export default function LoginPage() {
  const { login, oauthLogin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      await oauthLogin('google', credential);
      navigate('/');
    } catch (err) {
      setError(extractApiError(err, 'Google sign-in failed'));
    }
  }, [oauthLogin, navigate]);

  const googleBtnRef = useGoogleSignIn(handleGoogleCredential, 'signin_with');

  // Handle Apple redirect callback (tokens in URL fragment)
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      storeTokens(accessToken, refreshToken);
      refreshUser().then(() => navigate('/'));
      window.location.hash = '';
      return;
    }
    const err = searchParams.get('error');
    if (err) {
      const messages: Record<string, string> = {
        account_deactivated: 'This account has been deactivated.',
        unverified_account: 'An unverified account exists with this email. Verify it first.',
        email_not_verified: 'Email not verified by provider.',
      };
      setError(messages[err] || 'Sign-in failed');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authPageStyle}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Sign In</h1>
      {error && <div style={errorStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </label>
        <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: '100%', padding: '10px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={googleBtnRef} />
      </div>
      <button
        disabled
        style={{ ...primaryButtonStyle, width: '100%', padding: '10px', marginTop: 8, background: '#333', color: '#888', cursor: 'not-allowed', opacity: 0.6 }}
      >
        Sign in with Apple — Coming Soon
      </button>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Don't have an account? <Link to="/register" style={{ color: 'var(--accent-gold)' }}>Sign up</Link>
      </p>
    </div>
  );
}
