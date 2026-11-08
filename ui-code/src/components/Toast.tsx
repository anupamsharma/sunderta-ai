import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface Props {
  message: string;
  onClose: () => void;
  type?: 'success' | 'info';
}

export default function Toast({ message, onClose, type = 'success' }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{ background: 'var(--foreground)', color: '#fff', maxWidth: '90vw' }}>
      <CheckCircle size={16} color={type === 'success' ? '#4CAF82' : '#D9B85F'} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}
