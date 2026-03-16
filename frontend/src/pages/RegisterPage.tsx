import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { inputStyle, labelStyle, primaryButtonStyle, errorStyle, authPageStyle } from '../styles/form';
import { extractApiError } from '../utils/apiError';

export default function RegisterPage() {
  const { register, oauthLogin } = useAuth();
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
      <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</div>
      <GoogleLogin
        onSuccess={async (response) => {
          if (response.credential) {
            try {
              await oauthLogin('google', response.credential);
              navigate('/');
            } catch (err) {
              setError(extractApiError(err, 'Google sign-up failed'));
            }
          }
        }}
        onError={() => setError('Google sign-up failed')}
        theme="filled_black"
        size="large"
        width={352}
        text="signup_with"
      />
      <button
        onClick={() => {
          const state = crypto.randomUUID();
          document.cookie = `apple_oauth_state=${state};path=/;max-age=600;SameSite=None;Secure`;
          const params = new URLSearchParams({
            client_id: import.meta.env.VITE_APPLE_SERVICE_ID || '',
            redirect_uri: `${window.location.origin}/api/auth/oauth/apple/callback`,
            response_type: 'code id_token',
            response_mode: 'form_post',
            scope: 'name email',
            state,
          });
          window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
        }}
        style={{ ...primaryButtonStyle, width: '100%', padding: '10px', marginTop: 8, background: '#000', color: '#fff' }}
      >
        Sign up with Apple
      </button>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Sign in</Link>
      </p>
    </div>
  );
}
