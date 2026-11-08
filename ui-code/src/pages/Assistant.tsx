import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Info, Sparkles } from 'lucide-react';
import { suggestedPrompts, latestReport as mockReport } from '../data/mock';
import { createConversation, getConversation, sendMessage } from '../api/chat';
import { getAnalysisReport } from '../api/analyses';

interface Message {
  id: number | string;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [report, setReport] = useState(mockReport);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  useEffect(() => {
    (async () => {
      const analysisId = localStorage.getItem('sunderta_analysis_id') || undefined;
      try {
        if (analysisId) {
          const r = await getAnalysisReport(analysisId).catch(() => null);
          if (r) setReport(r);
        }
        const conv = await createConversation(analysisId);
        setConversationId(conv.id);
        const full = await getConversation(conv.id);
        setMessages((full.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'ai',
          text: m.text,
          time: m.time || getTime(),
        })));
      } catch {
        setMessages([{
          id: 1,
          role: 'ai',
          text: "Hi! I can help explain your skin report. (Assistant is offline — using local fallback.)",
          time: getTime(),
        }]);
      }
    })();
  }, []);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: 'user', text, time: getTime() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setTyping(true);
    try {
      if (!conversationId) throw new Error('No conversation');
      const reply = await sendMessage(conversationId, text);
      setMessages(m => [...m, { id: reply.id, role: 'ai', text: reply.text, time: reply.time || getTime() }]);
    } catch {
      setMessages(m => [...m, {
        id: Date.now() + 1,
        role: 'ai',
        text: 'I could not reach the assistant service. Please try again shortly.',
        time: getTime(),
      }]);
    } finally {
      setTyping(false);
    }
  };

  const reset = async () => {
    setMessages([]);
    setInput('');
    setTyping(false);
    const analysisId = localStorage.getItem('sunderta_analysis_id') || undefined;
    const conv = await createConversation(analysisId);
    setConversationId(conv.id);
    const full = await getConversation(conv.id);
    setMessages((full.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'ai',
      text: m.text,
      time: m.time || getTime(),
    })));
  };

  return (
    <div className="min-h-screen pt-14 md:pt-0 flex" style={{ background: 'var(--background)' }}>
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="shrink-0 px-4 md:px-8 py-4 flex items-center justify-between"
          style={{ background: 'rgba(255,253,249,0.95)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(10px)', paddingTop: 'max(16px, calc(56px + 16px))' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                <Sparkles size={18} color="#fff" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: '#4CAF82' }} />
            </div>
            <div>
              <p className="font-serif font-semibold text-base">Beauty AI</p>
              <p className="text-xs" style={{ color: '#4CAF82' }}>Online · Powered by Sunderta AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full" style={{ background: 'var(--muted)' }}><Info size={16} /></button>
            <button onClick={reset} className="p-2 rounded-full" style={{ background: 'var(--muted)' }}><RotateCcw size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-4">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={13} color="#fff" />
                </div>
              )}
              <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: m.role === 'user' ? 'var(--gold, #D9B85F)' : 'var(--card)',
                  color: m.role === 'user' ? '#171717' : 'var(--foreground)',
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                }}>
                {m.text}
                <div className="text-[10px] mt-1 opacity-60">{m.time}</div>
              </div>
            </div>
          ))}
          {typing && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Beauty AI is typing…</p>}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 md:px-8 pb-3 flex gap-2 overflow-x-auto">
          {suggestedPrompts.map(p => (
            <button key={p} onClick={() => send(p)} className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{p}</button>
          ))}
        </div>

        <div className="shrink-0 px-4 md:px-8 py-4 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask about your report…" className="flex-1 px-4 py-3 rounded-full text-sm outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
          <button onClick={() => send(input)} className="w-11 h-11 rounded-full gold-gradient flex items-center justify-center"><Send size={16} color="#fff" /></button>
        </div>
      </div>

      <aside className="hidden lg:flex w-80 flex-col gap-4 p-6" style={{ borderLeft: '1px solid var(--border)', background: 'var(--card)' }}>
        <h2 className="font-serif text-lg font-semibold">Latest report</h2>
        <p className="text-sm">Score: <strong>{report.score}</strong></p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{report.skinType}</p>
        <div className="flex flex-col gap-2">
          {(report.metrics || []).slice(0, 4).map((m: any) => (
            <div key={m.key} className="text-xs flex justify-between"><span>{m.label}</span><span>{m.score}</span></div>
          ))}
        </div>
      </aside>
    </div>
  );
}
