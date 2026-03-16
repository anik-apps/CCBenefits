import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, changePassword, getOAuthProviders, unlinkOAuthProvider } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import { extractApiError } from '../utils/apiError';
import { inputStyle, labelStyle, primaryButtonStyle } from '../styles/form';
import type { NotificationPreferences, ChannelPreferences } from '../types';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DEFAULT_CHANNEL: ChannelPreferences = {
  expiring_credits: true,
  period_start: true,
  utilization_summary: false,
  unused_recap: true,
  fee_approaching: false,
};

const DEFAULT_PREFS: NotificationPreferences = {
  email: { ...DEFAULT_CHANNEL },
  push: { ...DEFAULT_CHANNEL },
  notification_hour: 9,
};

const NOTIFICATION_TYPES: { key: keyof ChannelPreferences; label: string; description: string }[] = [
  { key: 'expiring_credits', label: 'Expiring Credits', description: 'Get notified 3 days before unused credits expire' },
  { key: 'period_start', label: 'Period Start', description: 'Reminder when a new benefit period begins' },
  { key: 'utilization_summary', label: 'Utilization Summary', description: 'Weekly digest of your benefits usage' },
  { key: 'unused_recap', label: 'Unused Recap', description: 'Summary of credits you missed after a period ends' },
  { key: 'fee_approaching', label: 'Fee Approaching', description: 'Alert 30 days before your card\'s annual fee renewal' },
];

function mergePrefs(raw: NotificationPreferences | null | undefined): NotificationPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS, email: { ...DEFAULT_CHANNEL }, push: { ...DEFAULT_CHANNEL } };
  return {
    email: { ...DEFAULT_CHANNEL, ...(raw.email || {}) },
    push: { ...DEFAULT_CHANNEL, ...(raw.push || {}) },
    notification_hour: raw.notification_hour ?? 9,
  };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export default function ProfilePage() {
  const { user, refreshUser, logout, oauthLogin } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currency, setCurrency] = useState(user?.preferred_currency || 'USD');
  const [tz, setTz] = useState(user?.timezone || 'UTC');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    mergePrefs(user?.notification_preferences)
  );
  const [notifMsg, setNotifMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [oauthProviders, setOauthProviders] = useState<{ provider: string; provider_email: string }[]>([]);
  const [oauthMsg, setOauthMsg] = useState('');

  useEffect(() => {
    getOAuthProviders().then(setOauthProviders).catch(() => {});
  }, []);

  const saveNotifPrefs = useCallback(async (prefs: NotificationPreferences) => {
    try {
      await updateProfile({ notification_preferences: prefs });
      await refreshUser();
      setNotifMsg('Saved');
      setTimeout(() => setNotifMsg(''), 2000);
    } catch {
      setNotifMsg('Failed to save');
      setTimeout(() => setNotifMsg(''), 3000);
    }
  }, [refreshUser]);

  const debouncedSave = useCallback((prefs: NotificationPreferences) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotifPrefs(prefs), 600);
  }, [saveNotifPrefs]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleToggleEmail = (key: keyof ChannelPreferences) => {
    const updated: NotificationPreferences = {
      ...notifPrefs,
      email: { ...notifPrefs.email, [key]: !notifPrefs.email[key] },
    };
    setNotifPrefs(updated);
    debouncedSave(updated);
  };

  const handleHourChange = (hour: number) => {
    const updated: NotificationPreferences = { ...notifPrefs, notification_hour: hour };
    setNotifPrefs(updated);
    debouncedSave(updated);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        display_name: displayName,
        preferred_currency: currency,
        timezone: tz,
      });
      await refreshUser();
      setProfileMsg('Profile updated');
    } catch {
      setProfileMsg('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePassword(currentPw, newPw);
      setPwMsg('Password changed');
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwMsg('Failed to change password');
    }
  };

  if (!user) return null;

  const toggleOn: React.CSSProperties = {
    width: 44,
    height: 24,
    borderRadius: 12,
    background: 'var(--accent-primary, #6c63ff)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
  };

  const toggleOff: React.CSSProperties = {
    ...toggleOn,
    background: 'rgba(255,255,255,0.15)',
  };

  const toggleDisabled: React.CSSProperties = {
    ...toggleOff,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const knobOn: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 3,
    left: 23,
    transition: 'left 0.2s',
  };

  const knobOff: React.CSSProperties = {
    ...knobOn,
    left: 3,
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Profile</h1>

      <form onSubmit={handleProfileSave} style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Account Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{user.email}</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Display Name</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Currency</span>
          <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={labelStyle}>Timezone</span>
          <select value={tz} onChange={(e) => setTz(e.target.value)} style={inputStyle}>
            {COMMON_TIMEZONES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            {!COMMON_TIMEZONES.includes(tz) && <option value={tz}>{tz.replace(/_/g, ' ')}</option>}
          </select>
        </label>
        <button type="submit" style={primaryButtonStyle}>Save</button>
        {profileMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{profileMsg}</span>}
      </form>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>
          Connected Accounts
          {oauthMsg && <span style={{ marginLeft: 12, fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{oauthMsg}</span>}
        </h3>
        {oauthProviders.map(p => (
          <div key={p.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.9rem' }}>{p.provider === 'google' ? 'Google' : 'Apple'} — <span style={{ color: 'var(--text-muted)' }}>{p.provider_email}</span></span>
            <button
              onClick={async () => {
                try {
                  await unlinkOAuthProvider(p.provider);
                  setOauthProviders(prev => prev.filter(op => op.provider !== p.provider));
                  setOauthMsg('Unlinked');
                  setTimeout(() => setOauthMsg(''), 2000);
                } catch (err) {
                  const msg = extractApiError(err, 'Failed to unlink');
                  if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('sign-in')) {
                    setOauthMsg('Set a password first before unlinking. Use "Set a password via email" below.');
                  } else {
                    setOauthMsg(msg);
                  }
                  setTimeout(() => setOauthMsg(''), 5000);
                }
              }}
              style={{ fontSize: '0.8rem', color: 'var(--accent-red)', cursor: 'pointer' }}
            >
              Unlink
            </button>
          </div>
        ))}
        {!oauthProviders.find(p => p.provider === 'google') && (
          <div style={{ marginTop: 8 }}>
            <GoogleLogin
              onSuccess={async (response) => {
                if (response.credential) {
                  try {
                    await oauthLogin('google', response.credential);
                    const providers = await getOAuthProviders();
                    setOauthProviders(providers);
                    setOauthMsg('Google linked');
                    setTimeout(() => setOauthMsg(''), 2000);
                  } catch (err) {
                    setOauthMsg(extractApiError(err, 'Failed to link Google'));
                    setTimeout(() => setOauthMsg(''), 3000);
                  }
                }
              }}
              onError={() => setOauthMsg('Failed to link Google')}
              theme="filled_black"
              size="medium"
              text="signin"
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>
          Notifications
          {notifMsg && <span style={{ marginLeft: 12, fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{notifMsg}</span>}
        </h3>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 0 }}>
          <div style={{ flex: 1 }} />
          <span style={{ width: 60, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</span>
          <span style={{ width: 60, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Push</span>
        </div>

        {NOTIFICATION_TYPES.map(({ key, label, description }) => (
          <div key={key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
            </div>
            <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleToggleEmail(key)}
                style={notifPrefs.email[key] ? toggleOn : toggleOff}
                aria-label={`Toggle email ${label}`}
              >
                <span style={notifPrefs.email[key] ? knobOn : knobOff} />
              </button>
            </div>
            <div style={{ width: 60, display: 'flex', justifyContent: 'center', position: 'relative' }} title="Mobile only">
              <button
                type="button"
                disabled
                style={toggleDisabled}
                aria-label={`Push ${label} - mobile only`}
              >
                <span style={knobOff} />
              </button>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Notification Time</span>
          <select
            value={notifPrefs.notification_hour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            style={{
              ...inputStyle,
              width: 'auto',
              padding: '6px 12px',
              fontSize: '0.85rem',
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tz.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Password</h3>
        {oauthProviders.length > 0 && !currentPw && pwMsg === '' ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              No password set. You can add one to enable email/password sign-in.
            </p>
            <a href="/forgot-password" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
              Set a password via email
            </a>
          </div>
        ) : null}
        <form onSubmit={handlePasswordChange} style={{ marginTop: oauthProviders.length > 0 ? 16 : 0 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={labelStyle}>Current Password</span>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle} />
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={labelStyle}>New Password</span>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} style={inputStyle} />
          </label>
          <button type="submit" style={{
            padding: '8px 20px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
            fontWeight: 600, border: '1px solid var(--border-medium)', cursor: 'pointer',
          }}>Change Password</button>
          {pwMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{pwMsg}</span>}
        </form>
      </div>

      <div>
        <button onClick={logout} style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'transparent', color: 'var(--status-danger)',
          fontWeight: 600, border: '1px solid var(--status-danger)', cursor: 'pointer',
        }}>Sign Out</button>
      </div>
    </div>
  );
}
