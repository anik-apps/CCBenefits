import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';
import { extractApiError } from '../utils/apiError';

declare const google: any;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function RegisterPage() {
  const { register, oauthLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      await oauthLogin('google', credential);
      navigate('/');
    } catch (err) {
      setError(extractApiError(err, 'Google sign-up failed'));
    }
  }, [oauthLogin, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const tryInit = () => {
      if (typeof google === 'undefined' || !google.accounts?.id) {
        setTimeout(tryInit, 300);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          handleGoogleCredential(response.credential);
        },
      });
      google.accounts.id.renderButton(googleBtnRef.current!, {
        theme: 'filled_black',
        size: 'large',
        width: 352,
        text: 'signup_with',
      });
    };
    tryInit();
  }, [handleGoogleCredential]);

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
      <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={googleBtnRef} />
      </div>
      <button
        disabled
        style={{ ...primaryButtonStyle, width: '100%', padding: '10px', marginTop: 8, background: '#333', color: '#888', cursor: 'not-allowed', opacity: 0.6 }}
      >
        Sign up with Apple — Coming Soon
      </button>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Sign in</Link>
      </p>
    </div>
  );
}
