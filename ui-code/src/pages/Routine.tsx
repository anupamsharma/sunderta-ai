import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, MessageCircle, Zap, Wallet } from 'lucide-react';
import { morningRoutine as mockMorning, nightRoutine as mockNight } from '../data/mock';
import Toast from '../components/Toast';
import { fetchRoutine, saveCompletions } from '../api/routine';

type Step = typeof morningRoutine[0];

function RoutineStep({ step, done, onToggle }: { step: Step; done: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ border: `1px solid ${done ? '#B8E0CB' : 'var(--border)'}`, background: done ? '#EAF4E7' : 'var(--card)' }}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: done ? '#4CAF82' : 'var(--gold)', color: '#fff' }}>
          {done ? <CheckCircle size={16} /> : step.step}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{step.type}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{step.ingredient}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{step.frequency}</span>
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            className="w-6 h-6 rounded-full transition-all"
            style={{ background: done ? '#4CAF82' : 'var(--border)' }}>
            {done && <CheckCircle size={12} color="#fff" className="mx-auto" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: done ? '#B8E0CB' : 'var(--border)' }}>
          <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--muted-foreground)' }}>{step.why}</p>
        </div>
      )}
    </div>
  );
}

export default function Routine() {
  const navigate = useNavigate();
  const [morningRoutine, setMorningRoutine] = useState(mockMorning);
  const [nightRoutine, setNightRoutine] = useState(mockNight);
  const [morningDone, setMorningDone] = useState(mockMorning.map(() => false));
  const [nightDone, setNightDone] = useState(mockNight.map(() => false));
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'morning' | 'night'>('morning');

  useEffect(() => {
    fetchRoutine().then(r => {
      if (r.morning?.length) { setMorningRoutine(r.morning); setMorningDone(r.morning.map(() => false)); }
      if (r.night?.length) { setNightRoutine(r.night); setNightDone(r.night.map(() => false)); }
    }).catch(() => {});
  }, []);

  const persist = (period: 'morning' | 'night', flags: boolean[]) => {
    const steps = flags.map((done, i) => done ? i + 1 : 0).filter(Boolean);
    const date = new Date().toISOString().slice(0, 10);
    saveCompletions(date, period, steps).catch(() => {});
  };

  const morningPct = Math.round((morningDone.filter(Boolean).length / Math.max(morningDone.length, 1)) * 100);
  const nightPct = Math.round((nightDone.filter(Boolean).length / Math.max(nightDone.length, 1)) * 100);
  const streak = morningPct + nightPct > 0 ? 1 : 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-20 md:pt-24">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Daily Care</span>
          <h1 className="font-serif text-3xl font-bold mt-1">Your Routine</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{ label: 'Morning', v: `${morningPct}%`, sub: 'done today' }, { label: 'Evening', v: `${nightPct}%`, sub: 'done today' }, { label: 'Streak', v: `${streak} days`, sub: 'keep it up!' }].map(s => (
            <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="font-serif text-xl font-bold" style={{ color: 'var(--gold)' }}>{s.v}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl p-1 mb-5" style={{ background: 'var(--muted)' }}>
          {(['morning', 'night'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
              style={{ background: tab === t ? 'var(--card)' : 'transparent', color: tab === t ? 'var(--foreground)' : 'var(--muted-foreground)', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              {t === 'morning' ? '☀️' : '🌙'} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 mb-6">
          {(tab === 'morning' ? morningRoutine : nightRoutine).map((s, i) => (
            <RoutineStep key={s.step} step={s}
              done={tab === 'morning' ? morningDone[i] : nightDone[i]}
              onToggle={() => {
                if (tab === 'morning') setMorningDone(d => {
                  const next = d.map((v, idx) => idx === i ? !v : v);
                  persist('morning', next);
                  return next;
                });
                else setNightDone(d => {
                  const next = d.map((v, idx) => idx === i ? !v : v);
                  persist('night', next);
                  return next;
                });
              }} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {[
            { icon: Zap, label: 'Simplify My Routine', action: () => setToast('Simplified routine: 3 essential steps shown.') },
            { icon: Wallet, label: 'Adjust for My Budget', action: () => setToast('Showing budget-friendly alternatives…') },
            { icon: MessageCircle, label: 'Ask Beauty AI', action: () => navigate('/assistant') },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={a.action}
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium w-full text-left transition-all hover:opacity-80"
                style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                <Icon size={16} style={{ color: 'var(--gold)' }} />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
