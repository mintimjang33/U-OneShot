'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function TruthRoomPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/truth-room')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setSending(true);

    const res = await fetch('/api/truth-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
  }

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-black mb-1">직언의방</h1>
      <p className="text-sm text-muted mb-6">1시간 티타임을 기다릴 필요 없습니다 — 핑계 대신 현실적인 피드백을 받아보세요.</p>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted">사업 아이디어나 고민을 편하게 털어놓아 보세요. 돌려 말하지 않을게요.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-[var(--radius-card)] px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-accent text-white' : 'border border-border'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-muted">생각하는 중...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="고민을 입력하세요"
          className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
