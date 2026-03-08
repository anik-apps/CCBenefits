import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, changePassword } from '../services/api';

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currency, setCurrency] = useState(user?.preferred_currency || 'USD');
  const [tz, setTz] = useState(user?.timezone || 'UTC');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

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

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Profile</h1>

      <form onSubmit={handleProfileSave} style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Account Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{user.email}</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Display Name</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currency</span>
          <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Timezone</span>
          <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} style={inputStyle} />
        </label>
        <button type="submit" style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
          color: '#0a0a0f', fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>Save</button>
        {profileMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{profileMsg}</span>}
      </form>

      <form onSubmit={handlePasswordChange} style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Change Password</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Password</span>
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Password</span>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} style={inputStyle} />
        </label>
        <button type="submit" style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
          fontWeight: 600, border: '1px solid var(--border-medium)', cursor: 'pointer',
        }}>Change Password</button>
        {pwMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{pwMsg}</span>}
      </form>

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
