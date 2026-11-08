import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, CheckCircle, AlertCircle, Clock, ArrowRight, RotateCcw, Video } from 'lucide-react';
import { compressImageFile, dataUrlToFile, fileToDataUrl, uploadAnalysis } from '../api/analyses';

type QualityState = 'pending' | 'warning' | 'good';

interface Quality {
  label: string;
  state: QualityState;
}

const instructions = [
  'Look straight at the camera',
  'Remove glasses if possible',
  'Keep hair away from your face',
  'Use natural or evenly distributed light',
  'Avoid makeup for the most useful analysis',
  'Keep your full face inside the oval guide',
];

export default function Analysis() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<File | null>(null);
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [quality, setQuality] = useState<Quality[]>([
    { label: 'Lighting', state: 'pending' },
    { label: 'Face Position', state: 'pending' },
    { label: 'Sharpness', state: 'pending' },
    { label: 'Face Visibility', state: 'pending' },
    { label: 'Distance', state: 'pending' },
  ]);

  const simulateQuality = useCallback(() => {
    const states: QualityState[] = ['good', 'good', 'good', 'good', 'good'];
    states.forEach((s, i) => {
      setTimeout(() => {
        setQuality(q => q.map((item, idx) => idx === i ? { ...item, state: s } : item));
      }, 600 + i * 400);
    });
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!window.isSecureContext) {
        setCameraError(
          'Live camera needs HTTPS. Open the Cloudflare https://…trycloudflare.com link, then try again — or use Upload Photo.',
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not available in this browser. Please use Upload Photo.');
        return;
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        // Softer constraints for phones that reject ideal sizes.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;
      // Mount <video> first; useEffect attaches the stream once the element exists.
      setCameraActive(true);
      setCapturedImage(null);
      setVideoPreview(null);
      simulateQuality();
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Allow camera access in browser settings, or use Upload Photo.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please use Upload Photo.');
      } else {
        setCameraError('Could not start camera. Please use Upload Photo.');
      }
      setCameraActive(false);
    }
  };

  // Attach stream after <video> is mounted (fixes blank preview on phones).
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video) {
        requestAnimationFrame(attach);
        return;
      }
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.play().catch(() => {});
    };
    attach();

    return () => {
      cancelled = true;
    };
  }, [cameraActive]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const maxEdge = 1280;
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    const scale = Math.min(1, maxEdge / Math.max(vw, vh));
    canvasRef.current.width = Math.round(vw * scale) || 640;
    canvasRef.current.height = Math.round(vh * scale) || 480;
    // Undo mirrored preview so the saved photo is not flipped.
    ctx.translate(canvasRef.current.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const raw = dataUrlToFile(canvasRef.current.toDataURL('image/jpeg', 0.85), 'capture.jpg');
    try {
      const compressed = await compressImageFile(raw);
      const preview = await fileToDataUrl(compressed);
      setCapturedImage(preview);
      setVideoPreview(null);
      fileRef.current = compressed;
      localStorage.setItem('sunderta_capture', preview);
    } catch {
      const img = canvasRef.current.toDataURL('image/jpeg', 0.72);
      setCapturedImage(img);
      fileRef.current = dataUrlToFile(img, 'capture.jpg');
      localStorage.setItem('sunderta_capture', img);
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.type.startsWith('video/') || mode === 'video') {
      setMode('video');
      fileRef.current = file;
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setCapturedImage(null);
      localStorage.removeItem('sunderta_capture');
      simulateQuality();
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      fileRef.current = compressed;
      const preview = await fileToDataUrl(compressed);
      setCapturedImage(preview);
      setVideoPreview(null);
      localStorage.setItem('sunderta_capture', preview);
      simulateQuality();
    } catch {
      fileRef.current = file;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = ev.target?.result as string;
        setCapturedImage(img);
        setVideoPreview(null);
        localStorage.setItem('sunderta_capture', img);
        simulateQuality();
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturedImage(null);
    setVideoPreview(null);
    fileRef.current = null;
    setCameraActive(false);
    setUploadError('');
    setCameraError('');
    setQuality(q => q.map(item => ({ ...item, state: 'pending' })));
  };

  const proceed = async () => {
    if (!consent || uploading) return;
    let file = fileRef.current;
    if (!file && capturedImage) {
      file = dataUrlToFile(capturedImage, 'capture.jpg');
    }
    if (!file) {
      setUploadError('Please capture or upload a file first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const result = await uploadAnalysis(mode, file, consent);
      localStorage.setItem('sunderta_analysis_id', result.id);
      localStorage.setItem('sunderta_analysis_mode', mode);
      navigate('/analysis/processing');
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const qualityIcon = (s: QualityState) => {
    if (s === 'good') return <CheckCircle size={16} color="#4CAF82" />;
    if (s === 'warning') return <AlertCircle size={16} color="#E9B44C" />;
    return <Clock size={16} color="#9B8E85" />;
  };

  const allGood = quality.every(q => q.state === 'good');

  return (
    <div className="min-h-screen pt-16" style={{ background: '#0F0E0D' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid md:grid-cols-[1fr_2fr_1fr] gap-6 items-start">

          {/* Instructions panel */}
          <div className="hidden md:block p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: '#FFFDF9' }}>For best results</h2>
            <ul className="flex flex-col gap-3">
              {instructions.map(i => (
                <li key={i} className="flex items-start gap-2 text-sm leading-snug" style={{ color: 'rgba(255,253,249,0.65)' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: 'var(--gold)' }}>✦</span>
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-6 p-3 rounded-2xl" style={{ background: 'rgba(217,184,95,0.1)', border: '1px solid rgba(217,184,95,0.2)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,253,249,0.5)' }}>
                This scan provides cosmetic skincare guidance. It is not a medical diagnosis. Results vary by lighting and camera quality.
              </p>
            </div>
          </div>

          {/* Camera area */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {(['image', 'video'] as const).map(m => (
                <button key={m} type="button" onClick={() => { setMode(m); retake(); }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize"
                  style={{ background: mode === m ? '#D9B85F' : 'rgba(255,255,255,0.08)', color: mode === m ? '#fff' : 'rgba(255,253,249,0.7)' }}>
                  {m}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: '3/4' }}>
              {mode === 'image' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 300 400" preserveAspectRatio="none">
                <defs>
                  <mask id="oval-mask">
                    <rect width="300" height="400" fill="white" />
                    <ellipse cx="150" cy="200" rx="110" ry="145" fill="black" />
                  </mask>
                </defs>
                <rect width="300" height="400" fill="rgba(0,0,0,0.55)" mask="url(#oval-mask)" />
                <ellipse cx="150" cy="200" rx="110" ry="145" fill="none" stroke="#D9B85F" strokeWidth="2.5" strokeDasharray="8 4" />
                <line x1="50" y1="185" x2="250" y2="185" stroke="rgba(217,184,95,0.4)" strokeWidth="1" />
              </svg>
              )}

              <div className="w-full h-full rounded-3xl overflow-hidden" style={{ background: '#1A1917' }}>
                {videoPreview ? (
                  <video src={videoPreview} className="w-full h-full object-cover" controls playsInline />
                ) : capturedImage ? (
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                ) : cameraActive ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)', background: '#000' }}
                    muted
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(217,184,95,0.1)', border: '2px dashed rgba(217,184,95,0.4)' }}>
                      {mode === 'video' ? <Video size={32} style={{ color: 'var(--gold)' }} /> : <Camera size={32} style={{ color: 'var(--gold)' }} />}
                    </div>
                    <p className="text-sm font-medium text-center" style={{ color: 'rgba(255,253,249,0.6)' }}>
                      {mode === 'video' ? 'Upload a short face video (max 30s)' : 'Position your face in the oval'}
                    </p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {cameraError && <p className="text-xs text-center" style={{ color: '#E07070' }}>{cameraError}</p>}
            {uploadError && <p className="text-xs text-center" style={{ color: '#E07070' }}>{uploadError}</p>}

            <div className="flex flex-wrap gap-3 justify-center w-full max-w-sm">
              {!cameraActive && !capturedImage && !videoPreview && (
                <>
                  {mode === 'image' && (
                  <button onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold gold-gradient"
                    style={{ color: '#fff', boxShadow: '0 4px 14px rgba(217,184,95,0.4)' }}>
                    <Camera size={16} /> Enable Camera
                  </button>
                  )}
                  <label className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold cursor-pointer"
                    style={{ border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,253,249,0.8)' }}>
                    <Upload size={16} /> {mode === 'video' ? 'Upload Video' : 'Upload Photo'}
                    <input type="file" accept={mode === 'video' ? 'video/*' : 'image/*'} className="hidden" onChange={handleUpload} />
                  </label>
                </>
              )}
              {cameraActive && !capturedImage && (
                <button onClick={capture}
                  className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold gold-gradient"
                  style={{ color: '#fff', boxShadow: '0 4px 14px rgba(217,184,95,0.4)' }}>
                  <Camera size={16} /> Take Photo
                </button>
              )}
              {(capturedImage || videoPreview) && (
                <button onClick={retake}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
                  style={{ border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,253,249,0.8)' }}>
                  <RotateCcw size={14} /> Retake
                </button>
              )}
            </div>

            {(capturedImage || videoPreview) && (
              <label className="flex items-start gap-3 max-w-sm cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 shrink-0 w-4 h-4 rounded" style={{ accentColor: 'var(--gold)' }} />
                <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,253,249,0.55)' }}>
                  I understand this scan provides cosmetic skincare guidance and is not a medical diagnosis.
                </span>
              </label>
            )}

            {(capturedImage || videoPreview) && consent && (
              <button onClick={proceed} disabled={uploading}
                className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold gold-gradient w-full max-w-sm justify-center"
                style={{ color: '#fff', boxShadow: '0 6px 20px rgba(217,184,95,0.4)', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading…' : 'Continue to Analysis'} <ArrowRight size={18} />
              </button>
            )}

            {/* Mobile instructions */}
            <div className="md:hidden p-4 rounded-2xl w-full max-w-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--gold)' }}>Tips for best results</p>
              <ul className="flex flex-col gap-1">
                {instructions.slice(0, 3).map(i => <li key={i} className="text-xs" style={{ color: 'rgba(255,253,249,0.55)' }}>• {i}</li>)}
              </ul>
            </div>
          </div>

          {/* Quality panel */}
          <div className="hidden md:block p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: '#FFFDF9' }}>Image quality</h2>
            <div className="flex flex-col gap-3">
              {quality.map(q => (
                <div key={q.label} className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: q.state === 'good' ? 'rgba(76,175,130,0.1)' : 'rgba(255,255,255,0.04)' }}>
                  <span className="text-sm" style={{ color: 'rgba(255,253,249,0.7)' }}>{q.label}</span>
                  {qualityIcon(q.state)}
                </div>
              ))}
            </div>
            {allGood && capturedImage && (
              <div className="mt-4 p-3 rounded-2xl text-center" style={{ background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)' }}>
                <p className="text-xs font-semibold" style={{ color: '#4CAF82' }}>✓ Image quality verified</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
