import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scan, FileText, Repeat, MessageCircle, TrendingUp, MapPin, ShieldCheck, Lock, Star, ChevronRight } from 'lucide-react';
import ScoreRing from '../components/ScoreRing';

const features = [
  { icon: Scan, title: 'AI Skin Analysis', desc: 'Scan your face using your device camera for a full visible-layer skin assessment.' },
  { icon: FileText, title: 'Personalized Report', desc: 'Get a detailed skin health report with scores across hydration, texture, clarity and more.' },
  { icon: Repeat, title: 'Custom Routine', desc: 'Morning and evening routines tailored precisely to your skin type and concerns.' },
  { icon: MessageCircle, title: 'Beauty AI Chat', desc: 'Ask anything about your skin, ingredients, or routine and get instant guidance.' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Compare scans over time and see measurable improvements in your skin health.' },
  { icon: MapPin, title: 'Salon Recommendations', desc: 'Discover professional treatments that complement your at-home skincare routine.' },
];

const steps = [
  { n: '01', title: 'Capture your face', desc: 'Use your device camera or upload a recent photo in good lighting.' },
  { n: '02', title: 'AI analyzes your skin', desc: 'Our model reviews visible skin characteristics across your full face.' },
  { n: '03', title: 'Receive your report', desc: 'Get a skin health score, type diagnosis, concerns, strengths and routine.' },
  { n: '04', title: 'Track and improve', desc: 'Compare monthly scans and chat with Beauty AI anytime.' },
];

const testimonials = [
  { name: 'Priya M.', location: 'Mumbai', text: 'I had no idea my skin was combination until Sunderta flagged my dry cheeks. My routine is finally working.', score: 89 },
  { name: 'Ananya R.', location: 'Bengaluru', text: 'The AI chat is surprisingly helpful. I asked about retinol and got the clearest explanation I\'ve ever read.', score: 85 },
  { name: 'Sneha K.', location: 'Delhi', text: 'Loved seeing my score go from 71 to 83 in just two months. The routine suggestions really make a difference.', score: 83 },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Hero */}
      <section className="hero-gradient pt-24 md:pt-32 pb-16 md:pb-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full w-fit"
              style={{ background: 'var(--secondary)', color: 'var(--gold)' }}>
              ✦ AI-powered skin intelligence
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              Understand your skin.<br />
              <span style={{ color: 'var(--gold)' }}>Improve it</span> with confidence.
            </h1>
            <p className="text-base md:text-lg leading-relaxed max-w-lg" style={{ color: 'var(--muted-foreground)' }}>
              Scan your face, receive a personalized skin report, build a routine, and talk to your AI beauty companion — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/analysis')}
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold gold-gradient transition-all hover:opacity-90 text-base"
                style={{ color: '#fff', boxShadow: '0 6px 20px rgba(217,184,95,0.4)' }}>
                Start Free Skin Analysis <ArrowRight size={18} />
              </button>
              <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base transition-all hover:opacity-80"
                style={{ border: '1.5px solid var(--border)', color: 'var(--foreground)', background: 'rgba(255,255,255,0.6)' }}>
                See How It Works
              </button>
            </div>
            <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--gold)' }} />
              Private, secure and designed for everyday skincare guidance
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              {/* Rings */}
              <div className="absolute inset-0 rounded-full scan-ring" style={{ border: '2px solid rgba(217,184,95,0.3)' }} />
              <div className="absolute inset-4 rounded-full scan-ring" style={{ border: '1.5px solid rgba(217,184,95,0.2)', animationDelay: '0.5s' }} />
              {/* Portrait */}
              <div className="absolute inset-8 rounded-full overflow-hidden" style={{ border: '3px solid var(--gold)', boxShadow: '0 0 30px rgba(217,184,95,0.2)' }}>
                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&auto=format&faces=1" alt="Healthy natural skin" className="w-full h-full object-cover" />
              </div>
              {/* Floating cards */}
              <div className="absolute -left-4 md:-left-12 top-8 px-3 py-2 rounded-2xl shadow-lg"
                style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Skin Score</p>
                <p className="font-serif text-2xl font-bold" style={{ color: 'var(--gold)' }}>82</p>
              </div>
              <div className="absolute -right-4 md:-right-10 top-16 px-3 py-2 rounded-2xl shadow-lg"
                style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Hydration</p>
                <p className="text-sm font-semibold" style={{ color: '#4CAF82' }}>Good</p>
              </div>
              <div className="absolute -left-4 md:-left-12 bottom-16 px-3 py-2 rounded-2xl shadow-lg"
                style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Skin Type</p>
                <p className="text-sm font-semibold">Combination</p>
              </div>
              <div className="absolute -right-2 md:-right-8 bottom-10 px-3 py-2 rounded-2xl shadow-lg"
                style={{ background: '#EAF4E7', border: '1px solid #B8E0CB' }}>
                <p className="text-xs font-semibold" style={{ color: '#2D7A56' }}>✓ Routine ready</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>How It Works</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2">Four steps to better skin</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(s => (
              <div key={s.n} className="p-6 rounded-3xl flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <span className="font-serif text-4xl font-bold" style={{ color: 'var(--secondary)', WebkitTextStroke: '1.5px var(--gold)' }}>{s.n}</span>
                <h3 className="font-serif text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 md:px-8" style={{ background: 'var(--muted)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Features</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2">Everything your skin needs</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-hover p-6 rounded-3xl flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--secondary)' }}>
                    <Icon size={20} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Report preview */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Skin Report Preview</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-4">Your skin at a glance</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
              Every scan produces a detailed report covering skin type, health metrics, concerns, strengths, and a fully personalized routine.
            </p>
            <button onClick={() => navigate('/report')}
              className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--gold)' }}>
              View Sample Report <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-6 mb-6">
              <ScoreRing score={82} size={100} strokeWidth={8} label="Score" delta={3} />
              <div>
                <p className="font-serif text-lg font-semibold">Skin Type: Combination</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Healthy, with a few areas to improve</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {['Mild Acne', 'Dry Zones', 'Dark Circles'].map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92600A' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
            {[{ label: 'Hydration', v: 86 }, { label: 'Texture', v: 88 }, { label: 'Tone Evenness', v: 81 }, { label: 'Clarity', v: 74 }].map(m => (
              <div key={m.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
                  <span className="font-semibold">{m.v}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full gold-gradient" style={{ width: `${m.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-16 px-4 md:px-8" style={{ background: 'var(--secondary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Lock size={28} style={{ color: 'var(--gold)', margin: '0 auto 12px' }} />
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">Your privacy, by design</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {['Your images remain private', 'You control scan history', 'Cosmetic guidance only — not medical', 'Consult a dermatologist for medical concerns'].map(p => (
              <div key={p} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-medium leading-snug">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Stories</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mt-2">Real results, real people</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="card-hover p-6 rounded-3xl flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#D9B85F" color="#D9B85F" />)}
                </div>
                <p className="text-sm leading-relaxed italic" style={{ color: 'var(--muted-foreground)' }}>"{t.text}"</p>
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.location}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--secondary)', color: 'var(--gold)' }}>Score: {t.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 md:px-8 hero-gradient">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Your skin changes.<br />Your routine should too.</h2>
          <p className="text-base mb-8" style={{ color: 'var(--muted-foreground)' }}>Start your free analysis today — no account required.</p>
          <button onClick={() => navigate('/analysis')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base gold-gradient hover:opacity-90 transition-all"
            style={{ color: '#fff', boxShadow: '0 8px 24px rgba(217,184,95,0.4)' }}>
            Start Free Skin Analysis <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8" style={{ background: 'var(--foreground)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {[
              { heading: 'Product', links: ['Skin Analysis', 'My Report', 'Routine Planner', 'AI Assistant', 'Progress History'] },
              { heading: 'Company', links: ['About Sunderta AI', 'How It Works', 'Blog', 'Careers'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Use', 'Disclaimer', 'Cookie Policy'] },
              { heading: 'Contact', links: ['hello@sunderta.ai', 'Support', 'Feedback'] },
            ].map(col => (
              <div key={col.heading}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>{col.heading}</p>
                <ul className="flex flex-col gap-2">
                  {col.links.map(l => <li key={l} className="text-sm opacity-60 hover:opacity-100 cursor-pointer transition-opacity" style={{ color: '#fff' }}>{l}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            <p className="text-xs leading-relaxed opacity-40" style={{ color: '#fff' }}>
              Sunderta AI provides cosmetic skincare information based on visible image characteristics and user-provided information. It does not diagnose, treat, or prevent medical conditions. Results may vary. Consult a qualified dermatologist for medical advice.
            </p>
            <p className="text-xs mt-3 opacity-40" style={{ color: '#fff' }}>© 2026 Sunderta AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
