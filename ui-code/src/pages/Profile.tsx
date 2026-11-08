import { useEffect, useState } from 'react';
import { User, Bell, Shield, Download, Trash2, LogOut } from 'lucide-react';
import Toast from '../components/Toast';
import { user } from '../data/mock';
import { deleteAllData, fetchProfile, updateProfile } from '../api/profile';

export default function Profile() {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState('25–34');
  const [budget, setBudget] = useState('₹500–₹2,000');
  const [goals, setGoals] = useState<string[]>(['Reduce acne', 'Even skin tone']);
  const [ff, setFf] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchProfile().then(p => {
      if (p.display_name) setName(p.display_name);
      if (p.budget_range) setBudget(p.budget_range);
      if (p.skin_goals?.length) setGoals(p.skin_goals);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    await updateProfile({
      display_name: name,
      budget_range: budget,
      skin_goals: goals,
      product_preferences: ff ? ['fragrance-free'] : [],
      privacy_preferences: { notifications },
    });
    setToast('Profile saved');
  };

  const goalOptions = ['Reduce acne', 'Even skin tone', 'Improve hydration', 'Anti-aging', 'Reduce dark circles', 'Brighter skin'];

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-20 md:pt-24">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Account</span>
          <h1 className="font-serif text-3xl font-bold mt-1">Profile & Settings</h1>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 p-5 rounded-3xl mb-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'var(--secondary)', color: 'var(--gold)' }}>
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-serif text-xl font-semibold">{name}</p>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>3 scans · Member since June 2026</p>
          </div>
        </div>

        {[
          {
            title: 'Personal Info',
            icon: User,
            content: (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Display Name</span>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Age Range (optional)</span>
                  <select value={age} onChange={e => setAge(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                    {['Under 18', '18–24', '25–34', '35–44', '45–54', '55+'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Budget Range</span>
                  <select value={budget} onChange={e => setBudget(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                    {['Under ₹500', '₹500–₹2,000', '₹2,000–₹5,000', 'Above ₹5,000'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <div>
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Skin Goals</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {goalOptions.map(g => (
                      <button key={g} onClick={() => setGoals(gg => gg.includes(g) ? gg.filter(x => x !== g) : [...gg, g])}
                        className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                        style={{ background: goals.includes(g) ? 'var(--gold)' : 'var(--muted)', color: goals.includes(g) ? '#fff' : 'var(--muted-foreground)' }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prefer fragrance-free products</span>
                  <button onClick={() => setFf(v => !v)}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: ff ? 'var(--gold)' : 'var(--border)' }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: ff ? '22px' : '2px' }} />
                  </button>
                </div>
                <button onClick={saveProfile}
                  className="py-3 rounded-xl font-semibold text-sm gold-gradient"
                  style={{ color: '#fff' }}>
                  Save Changes
                </button>
              </div>
            )
          },
          {
            title: 'Notifications',
            icon: Bell,
            content: (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Routine reminders</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Morning and evening routine nudges</p>
                </div>
                <button onClick={() => setNotifications(v => !v)}
                  className="w-11 h-6 rounded-full transition-all relative shrink-0"
                  style={{ background: notifications ? 'var(--gold)' : 'var(--border)' }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: notifications ? '22px' : '2px' }} />
                </button>
              </div>
            )
          },
          {
            title: 'Privacy & Data',
            icon: Shield,
            content: (
              <div className="flex flex-col gap-3">
                <button onClick={() => setToast('Downloading your data…')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all hover:opacity-80"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                  <Download size={15} style={{ color: 'var(--gold)' }} /> Download my data
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all hover:opacity-80"
                  style={{ background: '#FEF2F2', color: '#C0392B' }}>
                  <Trash2 size={15} /> Delete all scans
                </button>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  Scan images are stored locally in your browser and are never uploaded to any server. Sunderta AI does not collect or share personal health data.
                </p>
              </div>
            )
          },
        ].map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="p-5 rounded-3xl mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Icon size={16} style={{ color: 'var(--gold)' }} />
                <h2 className="font-serif text-base font-semibold">{section.title}</h2>
              </div>
              {section.content}
            </div>
          );
        })}

        <button className="flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-2xl w-full justify-center mt-2"
          style={{ border: '1.5px solid var(--border)', color: 'var(--muted-foreground)' }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm p-6 rounded-3xl" style={{ background: 'var(--card)' }}>
            <h3 className="font-serif text-lg font-bold mb-2">Delete all scans?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>This action cannot be undone. All scan history and reports will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'var(--muted)' }}>Cancel</button>
              <button onClick={async () => { await deleteAllData(); localStorage.clear(); setConfirmDelete(false); setToast('All scans deleted.'); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: '#C0392B', color: '#fff' }}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
