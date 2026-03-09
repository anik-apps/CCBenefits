import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import { useAuth } from '../hooks/useAuth';

type Status = 'loading' | 'success' | 'error' | 'already';

function getInitialStatus(isVerified: boolean | undefined, token: string | null): Status {
  if (isVerified) return 'already';
  if (!token) return 'error';
  return 'loading';
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>(() => getInitialStatus(user?.is_verified, token));
  const [error, setError] = useState(!token ? 'No verification token provided' : '');

  useEffect(() => {
    if (status !== 'loading' || !token) return;

    let cancelled = false;
    const verify = async () => {
      try {
        await verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          await refreshUser();
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error');
          setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Verification failed');
        }
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [token, status, refreshUser]);

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      {status === 'loading' && (
        <p style={{ color: 'var(--text-muted)' }}>Verifying your email...</p>
      )}
      {status === 'success' && (
        <>
          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--accent-gold)' }}>
            Email Verified!
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your email has been verified successfully.
          </p>
          <Link to="/" style={{ color: 'var(--accent-gold)' }}>Go to Dashboard</Link>
        </>
      )}
      {status === 'already' && (
        <>
          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Already Verified</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your email is already verified.
          </p>
          <Link to="/" style={{ color: 'var(--accent-gold)' }}>Go to Dashboard</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--status-danger)' }}>
            Verification Failed
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
          <Link to="/" style={{ color: 'var(--accent-gold)' }}>Go to Dashboard</Link>
        </>
      )}
    </div>
  );
}
