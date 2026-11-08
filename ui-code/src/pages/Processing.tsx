import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { getAnalysisStatus, retryAnalysis } from '../api/analyses';

const IMAGE_STEPS = [
  { stage: 'validating_upload', label: 'Checking image quality' },
  { stage: 'checking_image_quality', label: 'Detecting visible facial regions' },
  { stage: 'preparing_image', label: 'Estimating skin type' },
  { stage: 'analyzing_with_ai', label: 'Reviewing hydration appearance' },
  { stage: 'analyzing_with_ai', label: 'Checking visible acne and redness' },
  { stage: 'analyzing_with_ai', label: 'Reviewing pigmentation and dark circles' },
  { stage: 'generating_report', label: 'Reviewing fine lines and texture' },
  { stage: 'completed', label: 'Preparing personalized recommendations' },
];

const VIDEO_STEPS = [
  { stage: 'validating_upload', label: 'Validating upload' },
  { stage: 'reading_video', label: 'Reading video' },
  { stage: 'sampling_frames', label: 'Sampling frames' },
  { stage: 'checking_frame_quality', label: 'Checking frame quality' },
  { stage: 'selecting_frames', label: 'Selecting clearest frames' },
  { stage: 'analyzing_with_ai', label: 'Analyzing with AI' },
  { stage: 'generating_report', label: 'Generating report' },
  { stage: 'completed', label: 'Preparing personalized recommendations' },
];

function stageIndex(steps: typeof IMAGE_STEPS, stage: string, progress: number) {
  if (stage === 'completed' || progress >= 100) return steps.length - 1;
  if (stage === 'failed' || stage === 'cancelled') return Math.max(0, Math.min(steps.length - 2, Math.floor(progress / (100 / steps.length))));
  let idx = steps.findIndex(s => s.stage === stage);
  if (idx < 0) idx = Math.min(steps.length - 2, Math.floor((progress / 100) * (steps.length - 1)));
  return idx;
}

export default function Processing() {
  const navigate = useNavigate();
  const analysisId = localStorage.getItem('sunderta_analysis_id') || '';
  const mode = (localStorage.getItem('sunderta_analysis_mode') || 'image') as 'image' | 'video';
  const capturedImage = localStorage.getItem('sunderta_capture');
  const steps = mode === 'video' ? VIDEO_STEPS : IMAGE_STEPS;

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [progress, setProgress] = useState(5);
  const [message, setMessage] = useState('Starting analysis…');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('queued');

  useEffect(() => {
    if (!analysisId) {
      setError('No analysis job found. Please capture or upload again.');
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getAnalysisStatus(analysisId);
        if (cancelled) return;
        setStatus(data.status);
        setProgress(data.progress?.progress ?? 0);
        setMessage(data.progress?.message || '');
        const idx = stageIndex(steps, data.progress?.stage || data.status, data.progress?.progress || 0);
        setCurrentStep(idx);
        setCompleted(Array.from({ length: idx }, (_, i) => i));

        if (data.status === 'completed') {
          setCurrentStep(steps.length - 1);
          setCompleted(steps.map((_, i) => i));
          setProgress(100);
          setTimeout(() => navigate('/report'), 800);
          return false;
        }
        if (data.status === 'failed' || data.status === 'cancelled') {
          setError(data.error_message || 'Analysis failed.');
          return false;
        }
        return true;
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not fetch analysis status');
        return false;
      }
    };

    let timer: number | undefined;
    const start = async () => {
      const keepGoing = await poll();
      if (keepGoing && !cancelled) {
        timer = window.setInterval(async () => {
          const cont = await poll();
          if (!cont && timer) window.clearInterval(timer);
        }, 2000);
      }
    };
    start();
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [analysisId, navigate, steps]);

  const remaining = useMemo(() => Math.max(0, Math.round(((100 - progress) / 100) * 25)), [progress]);

  const onRetry = async () => {
    if (!analysisId) return;
    setError('');
    await retryAnalysis(analysisId);
    setStatus('queued');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: '#0F0E0D' }}>
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-36 h-36 rounded-full overflow-hidden" style={{ border: '3px solid var(--gold)', boxShadow: '0 0 30px rgba(217,184,95,0.3)' }}>
            {capturedImage ? (
              <img src={capturedImage} alt="Your scan" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: '#2A2825', color: 'rgba(255,253,249,0.4)' }}>
                {mode === 'video' ? 'Video scan' : 'Scan'}
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="scan-line absolute w-full h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,184,95,0.8), transparent)', left: 0 }} />
          </div>
          <div className="absolute -inset-3 rounded-full pointer-events-none scan-ring" style={{ border: '2px solid rgba(217,184,95,0.4)' }} />
        </div>

        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: '#FFFDF9' }}>
            {error ? 'Analysis issue' : 'Analyzing your skin…'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,253,249,0.5)' }}>
            {error || message || `Status: ${status}`}
          </p>
          {!error && (
            <p className="text-xs mt-1" style={{ color: 'rgba(255,253,249,0.35)' }}>
              Estimated time remaining: {remaining}s
            </p>
          )}
        </div>

        {error ? (
          <div className="w-full flex flex-col gap-3 items-center">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#E07070' }}>
              <AlertCircle size={16} /> {error}
            </div>
            <div className="flex gap-2">
              <button onClick={onRetry} className="px-5 py-2.5 rounded-full text-sm font-semibold gold-gradient" style={{ color: '#fff' }}>
                Retry
              </button>
              <button onClick={() => navigate('/analysis')} className="px-5 py-2.5 rounded-full text-sm font-semibold" style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#FFFDF9' }}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full">
              <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full gold-gradient transition-all duration-700" style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(217,184,95,0.5)' }} />
              </div>
              <p className="text-xs text-right mt-1" style={{ color: 'rgba(255,253,249,0.35)' }}>{progress}%</p>
            </div>

            <div className="w-full flex flex-col gap-2">
              {steps.map((step, i) => {
                const done = completed.includes(i) || i < currentStep;
                const active = i === currentStep && status !== 'completed';
                return (
                  <div key={`${step.label}-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300"
                    style={{ background: active ? 'rgba(217,184,95,0.1)' : done ? 'rgba(76,175,130,0.06)' : 'transparent', border: active ? '1px solid rgba(217,184,95,0.25)' : '1px solid transparent' }}>
                    <div className="shrink-0">
                      {done ? (
                        <CheckCircle size={18} color="#4CAF82" className="step-check" />
                      ) : active ? (
                        <Loader size={18} color="#D9B85F" className="animate-spin" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full" style={{ width: 18, height: 18, border: '1.5px solid rgba(255,255,255,0.2)' }} />
                      )}
                    </div>
                    <span className="text-sm" style={{ color: done ? 'rgba(255,253,249,0.5)' : active ? '#FFFDF9' : 'rgba(255,253,249,0.3)' }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
