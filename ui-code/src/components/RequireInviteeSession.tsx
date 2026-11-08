import { useEffect, useState, type ReactNode } from 'react';
import { accessMe } from '../api/auth';
import { ApiError } from '../api/client';

type Session = { user_id: string; name: string; token: string };

let cached: Session | null | undefined;

export function clearSessionCache() {
  cached = undefined;
}

export function useInviteeSession() {
  const [session, setSession] = useState<Session | null>(cached === undefined ? null : cached);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cached !== undefined) {
        setSession(cached);
        setLoading(false);
        return;
      }
      try {
        const me = await accessMe();
        if (!cancelled) {
          cached = me;
          setSession(me);
        }
      } catch (err) {
        if (!cancelled) {
          cached = null;
          setSession(null);
          if (!(err instanceof ApiError && err.status === 401)) {
            console.warn('session check failed', err);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { session, loading, setSession: (s: Session | null) => { cached = s; setSession(s); } };
}

export function RequireInviteeSession({ children }: { children: ReactNode }) {
  const { session, loading } = useInviteeSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Checking access…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full p-8 rounded-3xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h1 className="font-serif text-2xl font-semibold mb-2">Invite required</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            Sunderta AI is private. Open the personal access link you were sent, then enter your password.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
