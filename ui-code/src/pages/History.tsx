import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Calendar, TrendingUp, Trash2 } from 'lucide-react';
import ScoreRing from '../components/ScoreRing';
import { scanHistory as mockHistory, trendData as mockTrend } from '../data/mock';
import { createComparison, fetchHistory } from '../api/history';
import { deleteAnalysis } from '../api/analyses';

const metrics = ['score', 'hydration', 'acne', 'pigmentation', 'texture', 'darkcircles'] as const;
const metricLabels: Record<string, string> = { score: 'Overall', hydration: 'Hydration', acne: 'Clarity', pigmentation: 'Tone', texture: 'Texture', darkcircles: 'Dark Circles' };

export default function History() {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<string>('score');
  const [scanHistory, setScanHistory] = useState(mockHistory);
  const [trendData, setTrendData] = useState(mockTrend);
  const [mode, setMode] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await fetchHistory(mode || undefined);
      const items = data.items || [];
      if (items.length) {
        setScanHistory(items.map((s: any) => ({
          id: s.id,
          date: s.date,
          score: s.score || 0,
          skinType: s.skinType || '',
          concerns: s.concerns || [],
          improvement: s.status === 'completed' ? 'Completed' : s.status,
          image: s.image || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&auto=format',
          status: s.status,
          mode: s.mode,
        })));
        const completed = items.filter((s: any) => s.status === 'completed' && s.score);
        if (completed.length) {
          setTrendData(completed.slice().reverse().map((s: any) => ({
            month: s.date?.slice(5, 7) || '',
            score: s.score,
            hydration: s.score,
            acne: s.score,
            pigmentation: s.score,
            texture: s.score,
            darkcircles: s.score,
          })));
        }
      }
    } catch {
      // keep mock
    }
  };

  useEffect(() => { load(); }, [mode]);

  const openReport = (id: string) => {
    localStorage.setItem('sunderta_analysis_id', id);
    navigate('/report');
  };

  const onCompare = async (prevId: string, currId: string) => {
    try {
      setError('');
      const result = await createComparison(prevId, currId);
      setComparison(result);
    } catch (err: any) {
      setError(err?.message || 'Comparison failed');
    }
  };

  const onDelete = async (id: string) => {
    await deleteAnalysis(id);
    await load();
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-20 md:pt-24">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Progress</span>
            <h1 className="font-serif text-3xl font-bold mt-1">Scan History</h1>
          </div>
          <div className="flex gap-2">
            {['', 'image', 'video'].map(m => (
              <button key={m || 'all'} onClick={() => setMode(m)} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: mode === m ? 'var(--gold)' : 'var(--muted)', color: mode === m ? '#fff' : 'var(--muted-foreground)' }}>
                {m || 'All'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm mb-4" style={{ color: '#E07070' }}>{error}</p>}

        <div className="p-6 rounded-3xl mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} style={{ color: 'var(--gold)' }} />
              <h2 className="font-serif text-lg font-semibold">Skin Trends</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.map(m => (
                <button key={m} onClick={() => setActiveMetric(m)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={{ background: activeMetric === m ? 'var(--gold)' : 'var(--muted)', color: activeMetric === m ? '#fff' : 'var(--muted-foreground)' }}>
                  {metricLabels[m]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey={activeMetric} stroke="#D9B85F" strokeWidth={2.5} dot={{ fill: '#D9B85F', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4">
          {scanHistory.map((scan: any, i: number) => (
            <div key={scan.id} className="p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-5"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0" style={{ border: '2px solid var(--border)' }}>
                <img src={scan.image} alt="Scan" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={13} style={{ color: 'var(--muted-foreground)' }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{scan.date}</span>
                  {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--secondary)', color: 'var(--gold)' }}>Latest</span>}
                  {scan.mode && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)' }}>{scan.mode}</span>}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-serif text-2xl font-bold">{scan.score || '—'}</span>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{scan.skinType}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EAF4E7', color: '#2D7A56' }}>{scan.improvement}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(scan.concerns || []).map((c: string) => <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92600A' }}>{c}</span>)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openReport(scan.id)} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ border: '1.5px solid var(--gold)', color: 'var(--gold)' }}>View Report</button>
                {i < scanHistory.length - 1 && (
                  <button onClick={() => onCompare(scanHistory[i + 1].id, scan.id)} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>Compare</button>
                )}
                <button onClick={() => onDelete(scan.id)} className="p-2 rounded-full" style={{ background: 'var(--muted)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {comparison && (
          <div className="mt-8 p-6 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-lg font-semibold mb-2">Scan Comparison</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>{comparison.disclaimer}</p>
            {comparison.conditionWarning && <p className="text-xs mb-3" style={{ color: '#92600A' }}>{comparison.conditionWarning}</p>}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="text-center"><p className="text-xs mb-1">Previous</p><ScoreRing score={comparison.previousOverall} size={80} strokeWidth={7} /></div>
              <div className="text-center"><p className="text-xs mb-1">Current</p><ScoreRing score={comparison.currentOverall} size={80} strokeWidth={7} /></div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={(comparison.categories || []).filter((c: any) => c.key !== 'overall')}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="previous" fill="#C4B5A0" />
                <Bar dataKey="current" fill="#D9B85F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
