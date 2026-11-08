import { FormEvent, useEffect, useState } from 'react';
import {
  AccessLink,
  adminLogin,
  adminLogout,
  adminMe,
  createAccessLink,
  deleteAccessLink,
  listAccessLinks,
  resetAccessLinkPassword,
} from '../api/auth';
import { ApiError } from '../api/client';

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [name, setName] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const loadLinks = async () => {
    const items = await listAccessLinks();
    setLinks(items);
  };

  useEffect(() => {
    (async () => {
      try {
        await adminMe();
        setAuthed(true);
        await loadLinks();
      } catch {
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminLogin(password);
      setAuthed(true);
      setPassword('');
      await loadLinks();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const link = await createAccessLink(name.trim(), linkPassword);
      const url = `${window.location.origin}${link.url_path}`;
      setCreatedUrl(url);
      setName('');
      setLinkPassword('');
      await loadLinks();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Could not create link');
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (link: AccessLink) => {
    const next = window.prompt(`New password for ${link.name}`);
    if (!next) return;
    setBusy(true);
    setError('');
    try {
      await resetAccessLinkPassword(link.id, next);
      await loadLinks();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (link: AccessLink) => {
    if (!window.confirm(`Delete access for ${link.name}? Their analyses and chats will be removed.`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteAccessLink(link.id);
      await loadLinks();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy this URL', text);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading admin…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <form onSubmit={onLogin} className="w-full max-w-sm p-8 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h1 className="font-serif text-2xl font-semibold mb-1">Admin</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Enter the admin password to manage invite links.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-3"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          />
          {error && <p className="text-sm mb-3" style={{ color: '#C45C5C' }}>{error}</p>}
          <button disabled={busy || !password} type="submit" className="w-full py-3 rounded-full font-semibold gold-gradient" style={{ color: '#171717' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-10" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Invite links</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Create a personal URL + password for each person. Their analyses and assistant stay scoped to that link.
            </p>
          </div>
          <button
            onClick={async () => { await adminLogout(); setAuthed(false); }}
            className="text-sm px-4 py-2 rounded-full"
            style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
          >
            Log out
          </button>
        </div>

        <form onSubmit={onCreate} className="p-6 rounded-3xl mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="font-serif text-lg font-semibold mb-4">Create link</h2>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Person name"
              required
              className="px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            />
            <input
              type="password"
              value={linkPassword}
              onChange={e => setLinkPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              required
              minLength={6}
              className="px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            />
          </div>
          {error && <p className="text-sm mb-3" style={{ color: '#C45C5C' }}>{error}</p>}
          {createdUrl && (
            <div className="mb-3 p-3 rounded-2xl text-sm" style={{ background: 'var(--secondary)' }}>
              <p className="font-medium mb-1">Created — send this URL:</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 break-all text-xs">{createdUrl}</code>
                <button type="button" onClick={() => copy(createdUrl)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--gold)', color: '#171717' }}>
                  Copy
                </button>
              </div>
            </div>
          )}
          <button disabled={busy} type="submit" className="px-5 py-2.5 rounded-full font-semibold gold-gradient" style={{ color: '#171717' }}>
            {busy ? 'Working…' : 'Create invite link'}
          </button>
        </form>

        <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-serif text-lg font-semibold">Links ({links.length})</h2>
          </div>
          {links.length === 0 ? (
            <p className="px-6 py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>No links yet.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {links.map(link => {
                const url = `${window.location.origin}${link.url_path}`;
                return (
                  <li key={link.id} className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{link.name}</p>
                      <p className="text-xs break-all mt-1" style={{ color: 'var(--muted-foreground)' }}>{url}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        Created {formatDate(link.created_at)} · Last login {formatDate(link.last_login_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button type="button" onClick={() => copy(url)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--muted)' }}>Copy URL</button>
                      <button type="button" onClick={() => onReset(link)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--muted)' }}>Reset password</button>
                      <button type="button" onClick={() => onDelete(link)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#F8E4E3', color: '#8B3A3A' }}>Delete</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
