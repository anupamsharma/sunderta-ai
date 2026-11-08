import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Scan, FileText, Repeat, ShoppingBag, MessageCircle, Clock, User, Menu, X, Sparkles, Home, LogOut } from 'lucide-react';
import { accessLogout } from '../api/auth';
import { clearSessionCache, useInviteeSession } from './RequireInviteeSession';

const navLinks = [
  { to: '/analysis', label: 'Skin Analysis', icon: Scan },
  { to: '/report', label: 'My Report', icon: FileText },
  { to: '/routine', label: 'Routine', icon: Repeat },
  { to: '/products', label: 'Products', icon: ShoppingBag },
  { to: '/assistant', label: 'AI Assistant', icon: MessageCircle },
  { to: '/history', label: 'Scan History', icon: Clock },
  { to: '/profile', label: 'Profile', icon: User },
];

const bottomNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/report', label: 'Report', icon: FileText },
  { to: '/analysis', label: 'Analyze', icon: Scan, primary: true },
  { to: '/assistant', label: 'AI Chat', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useInviteeSession();

  const logout = async () => {
    try {
      await accessLogout();
    } catch {
      // ignore
    }
    clearSessionCache();
    window.location.href = '/';
  };

  return (
    <>
      {/* Desktop nav */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 py-4"
        style={{ background: 'rgba(255,253,249,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
            <Sparkles size={14} color="#fff" />
          </div>
          <span className="font-serif text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Sunderta AI</span>
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to}
              className="text-sm font-medium transition-colors"
              style={{ color: location.pathname === l.to ? 'var(--gold)' : 'var(--muted-foreground)' }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session && (
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{session.name}</span>
          )}
          <button
            onClick={logout}
            className="text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5"
            style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
          >
            <LogOut size={14} /> Log out
          </button>
          <button onClick={() => navigate('/analysis')}
            className="text-sm font-semibold px-5 py-2.5 rounded-full gold-gradient transition-all hover:opacity-90"
            style={{ color: '#fff', boxShadow: '0 4px 14px rgba(217,184,95,0.35)' }}>
            Analyze My Skin
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(255,253,249,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center">
            <Sparkles size={12} color="#fff" />
          </div>
          <span className="font-serif text-lg font-semibold">Sunderta AI</span>
        </Link>
        <button onClick={() => setOpen(o => !o)} className="p-2">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 pt-14" style={{ background: 'rgba(255,253,249,0.98)', backdropFilter: 'blur(20px)' }}>
          <nav className="flex flex-col p-6 gap-1">
            {session && (
              <p className="px-4 pb-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>Signed in as {session.name}</p>
            )}
            {navLinks.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-medium transition-colors"
                  style={{ background: location.pathname === l.to ? 'var(--secondary)' : 'transparent', color: location.pathname === l.to ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                  <Icon size={18} style={{ color: location.pathname === l.to ? 'var(--gold)' : 'inherit' }} />
                  {l.label}
                </Link>
              );
            })}
            <button onClick={() => { navigate('/analysis'); setOpen(false); }}
              className="mt-4 w-full py-4 rounded-2xl font-semibold gold-gradient"
              style={{ color: '#fff', boxShadow: '0 4px 14px rgba(217,184,95,0.35)' }}>
              Analyze My Skin
            </button>
            <button onClick={() => { setOpen(false); logout(); }}
              className="mt-2 w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
              <LogOut size={16} /> Log out
            </button>
          </nav>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{ background: 'rgba(255,253,249,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {bottomNav.map(l => {
          const Icon = l.icon;
          const active = location.pathname === l.to;
          if (l.primary) return (
            <Link key={l.to} to={l.to}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-full gold-gradient -mt-5"
              style={{ boxShadow: '0 6px 20px rgba(217,184,95,0.5)' }}>
              <Icon size={22} color="#fff" />
            </Link>
          );
          return (
            <Link key={l.to} to={l.to} className="flex flex-col items-center gap-0.5 px-2">
              <Icon size={20} style={{ color: active ? 'var(--gold)' : 'var(--muted-foreground)' }} />
              <span className="text-[10px] font-medium" style={{ color: active ? 'var(--gold)' : 'var(--muted-foreground)' }}>{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
