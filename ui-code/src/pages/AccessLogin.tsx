import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accessLogin, getAccessInfo } from '../api/auth';
import { ApiError } from '../api/client';
import { clearSessionCache } from '../components/RequireInviteeSession';

export default function AccessLogin() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const info = await getAccessInfo(token);
        setName(info.name);
      } catch {
        setMissing(true);
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await accessLogin(token, password);
      clearSessionCache();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full p-8 rounded-3xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h1 className="font-serif text-2xl font-semibold mb-2">Link not found</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>This invite URL is invalid or was deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <form onSubmit={onSubmit} className="w-full max-w-sm p-8 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>Personal access</p>
        <h1 className="font-serif text-2xl font-semibold mb-1">Welcome{name ? `, ${name}` : ''}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Enter the password you were given to open Sunderta AI.</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-3"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        />
        {error && <p className="text-sm mb-3" style={{ color: '#C45C5C' }}>{error}</p>}
        <button disabled={busy || !password} type="submit" className="w-full py-3 rounded-full font-semibold gold-gradient" style={{ color: '#171717' }}>
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
