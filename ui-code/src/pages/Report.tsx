import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, MessageCircle, ChevronDown, ChevronUp, AlertTriangle, X, CheckCircle } from 'lucide-react';
import ScoreRing from '../components/ScoreRing';
import ProductCard from '../components/ProductCard';
import Toast from '../components/Toast';
import { latestReport as mockReport, morningRoutine as mockMorning, nightRoutine as mockNight, products as mockProducts, user as mockUser } from '../data/mock';
import { getAnalysisReport } from '../api/analyses';
import { fetchProducts } from '../api/products';
import { fetchProfile } from '../api/profile';

const faceZones = ['Acne', 'Pigmentation', 'Dryness', 'Dark Circles', 'Fine Lines'];

export default function Report() {
  const navigate = useNavigate();
  const [latestReport, setLatestReport] = useState(mockReport);
  const [morningRoutine, setMorningRoutine] = useState(mockMorning);
  const [nightRoutine, setNightRoutine] = useState(mockNight);
  const [products, setProducts] = useState(mockProducts);
  const [user, setUser] = useState(mockUser);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState('Acne');
  const [expandedConcern, setExpandedConcern] = useState<string | null>(null);
  const [morningDone, setMorningDone] = useState<boolean[]>(mockMorning.map(() => false));
  const [nightDone, setNightDone] = useState<boolean[]>(mockNight.map(() => false));
  const [modal, setModal] = useState<typeof mockReport.concerns[0] | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const analysisId = localStorage.getItem('sunderta_analysis_id');
    (async () => {
      try {
        if (analysisId) {
          const report = await getAnalysisReport(analysisId);
          setLatestReport(report);
          setMorningRoutine(report.morningRoutine || []);
          setNightRoutine(report.nightRoutine || []);
          setMorningDone((report.morningRoutine || []).map(() => false));
          setNightDone((report.nightRoutine || []).map(() => false));
        }
        const [prods, profile] = await Promise.all([
          fetchProducts().catch(() => mockProducts),
          fetchProfile().catch(() => null),
        ]);
        if (Array.isArray(prods) && prods.length) setProducts(prods);
        if (profile?.display_name) setUser({ ...mockUser, name: profile.display_name });
      } catch {
        // keep mock fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scoreColor = (s: number) => s >= 85 ? '#4CAF82' : s >= 70 ? '#D9B85F' : '#E07070';
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}><p>Loading report…</p></div>;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-24">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{latestReport.date} · Today's Beauty Report</p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mt-1">Hello, {user.name} 👋</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/assistant')}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full"
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
              <MessageCircle size={15} /> Ask Beauty AI
            </button>
            <button onClick={() => setToast('Report downloaded!')}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full"
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
              <Download size={15} />
            </button>
            <button onClick={() => setToast('Link copied!')}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full"
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Score + metrics */}
        <div className="grid md:grid-cols-[auto_1fr] gap-6 mb-8">
          <div className="p-6 rounded-3xl flex flex-col items-center gap-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <ScoreRing score={latestReport.score} size={160} strokeWidth={10} label="Health Score" delta={latestReport.score - latestReport.prevScore} />
            <p className="text-sm text-center mt-1" style={{ color: 'var(--muted-foreground)' }}>Healthy, with a few areas to improve</p>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-lg font-semibold mb-4">Score Breakdown</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {latestReport.metrics.map(m => (
                <div key={m.key}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{m.confidence}</span>
                      <span className="text-sm font-bold" style={{ color: scoreColor(m.score) }}>{m.score}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.score}%`, background: scoreColor(m.score) }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skin type */}
        <div className="p-6 rounded-3xl mb-6" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Skin Type</span>
            <span className="font-serif text-xl font-bold">{latestReport.skinType}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{latestReport.skinTypeDesc}</p>
        </div>

        {/* Concerns + Strengths */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-lg font-semibold mb-4">Main Concerns</h2>
            <div className="flex flex-col gap-2">
              {latestReport.concerns.map(c => (
                <div key={c.id}>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all"
                    style={{ background: expandedConcern === c.id ? 'var(--muted)' : 'transparent', border: `1px solid ${expandedConcern === c.id ? 'var(--border)' : 'transparent'}` }}
                    onClick={() => setExpandedConcern(expandedConcern === c.id ? null : c.id)}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-sm font-medium">{c.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92600A' }}>{c.severity}</span>
                    </div>
                    {expandedConcern === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {expandedConcern === c.id && (
                    <div className="px-4 pb-3 pt-1 rounded-b-2xl" style={{ background: 'var(--muted)' }}>
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}><strong>Observed:</strong> {c.observed}</p>
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}><strong>May mean:</strong> {c.meaning}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}><strong>Next step:</strong> {c.nextStep}</p>
                      <button onClick={() => setModal(c)} className="mt-2 text-xs font-semibold" style={{ color: 'var(--gold)' }}>More details →</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-lg font-semibold mb-4">Skin Strengths</h2>
            <div className="grid grid-cols-2 gap-3">
              {latestReport.strengths.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: '#EAF4E7', border: '1px solid #B8E0CB' }}>
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm font-medium leading-snug">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Face map */}
        <div className="p-6 rounded-3xl mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-serif text-lg font-semibold">Face Analysis Map</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Estimated cosmetic analysis — not a medical assessment</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {faceZones.map(z => (
                <button key={z} onClick={() => setActiveZone(z)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={{ background: activeZone === z ? 'var(--gold)' : 'var(--muted)', color: activeZone === z ? '#fff' : 'var(--muted-foreground)' }}>
                  {z}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-48 h-60 mx-auto">
            <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=380&fit=crop&auto=format" alt="Face map" className="w-full h-full object-cover rounded-3xl" />
            {activeZone === 'Acne' && <>
              <div className="absolute w-4 h-4 rounded-full animate-pulse" style={{ background: 'rgba(233,180,76,0.7)', top: '28%', left: '48%' }} />
              <div className="absolute w-3 h-3 rounded-full animate-pulse" style={{ background: 'rgba(233,180,76,0.6)', top: '38%', left: '35%', animationDelay: '0.3s' }} />
            </>}
            {activeZone === 'Dryness' && <>
              <div className="absolute w-10 h-10 rounded-full" style={{ background: 'rgba(158,200,224,0.35)', top: '40%', left: '12%' }} />
              <div className="absolute w-10 h-10 rounded-full" style={{ background: 'rgba(158,200,224,0.35)', top: '40%', right: '12%' }} />
            </>}
            {activeZone === 'Dark Circles' && <>
              <div className="absolute w-12 h-4 rounded-full" style={{ background: 'rgba(168,156,200,0.4)', top: '36%', left: '50%', transform: 'translateX(-50%)' }} />
            </>}
          </div>
        </div>

        {/* Routines */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[{ title: 'Morning Routine', steps: morningRoutine, done: morningDone, setDone: setMorningDone },
            { title: 'Night Routine', steps: nightRoutine, done: nightDone, setDone: setNightDone }].map(({ title, steps, done, setDone }) => (
            <div key={title} className="p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h2 className="font-serif text-lg font-semibold mb-4">{title}</h2>
              <div className="flex flex-col gap-3">
                {steps.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-2xl transition-all"
                    style={{ background: done[i] ? '#EAF4E7' : 'var(--muted)', border: `1px solid ${done[i] ? '#B8E0CB' : 'transparent'}` }}>
                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--gold)', color: '#fff' }}>{s.step}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{s.type}</p>
                        <label className="cursor-pointer">
                          <input type="checkbox" className="hidden" checked={done[i]}
                            onChange={() => setDone(d => d.map((v, idx) => idx === i ? !v : v))} />
                          <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                            style={{ background: done[i] ? '#4CAF82' : 'var(--border)' }}>
                            {done[i] && <CheckCircle size={12} color="#fff" />}
                          </div>
                        </label>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{s.ingredient}</p>
                      <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--muted-foreground)' }}>{s.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Products */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6">Recommended Products</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} onAdd={() => setToast(`${p.name} added to routine!`)} />)}
          </div>
          <button onClick={() => navigate('/products')} className="mt-4 text-sm font-semibold" style={{ color: 'var(--gold)' }}>
            View all recommendations →
          </button>
        </div>

        {/* Salon */}
        <div className="p-6 rounded-3xl mb-6" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Salon Recommendation</span>
          <h3 className="font-serif text-lg font-semibold mt-1 mb-2">Hydra-Facial Treatment</h3>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Based on your dryness zones and mild acne, a hydra-facial can deeply cleanse pores while infusing moisture. Recommended once every 4–6 weeks as a complement to your daily routine. This is entirely optional.
          </p>
          <button onClick={() => setToast('Opening nearby salons…')}
            className="text-sm font-semibold px-5 py-2.5 rounded-full gold-gradient"
            style={{ color: '#fff' }}>
            Book Appointment
          </button>
        </div>

        {/* Expert alert */}
        <div className="p-5 rounded-3xl flex items-start gap-4 mb-8" style={{ background: '#FEF3C7', border: '1px solid #F59E0B22' }}>
          <AlertTriangle size={20} style={{ color: '#E9B44C', shrink: 0, marginTop: 2 }} />
          <p className="text-sm leading-relaxed" style={{ color: '#92600A' }}>
            If you have persistent irritation, painful acne, sudden skin changes, or any other medical concern, consult a qualified dermatologist. Sunderta AI provides cosmetic guidance only.
          </p>
        </div>
      </div>

      {/* Concern detail modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-serif text-xl font-bold">{modal.label}</h3>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-2xl" style={{ background: 'var(--muted)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)' }}>What AI observed</p>
                <p className="text-sm leading-relaxed">{modal.observed}</p>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: 'var(--muted)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)' }}>What it may mean</p>
                <p className="text-sm leading-relaxed">{modal.meaning}</p>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: 'var(--muted)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)' }}>Recommended next step</p>
                <p className="text-sm leading-relaxed">{modal.nextStep}</p>
              </div>
            </div>
            <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              This is cosmetic guidance based on visible appearance. For medical concerns, consult a dermatologist.
            </p>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
