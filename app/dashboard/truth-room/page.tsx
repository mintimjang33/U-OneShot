'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

// 원본(8-2절) 실측 예시 질문의 취지를 참고해 우리 표현으로 새로 쓴 예시들.
const SUGGESTED_PROMPTS = [
  '시청자가 영상 중간에 못 이탈하게 만드는 장치는?',
  '무자본으로 시작해서 대형 채널을 앞지르는 전략은?',
  '시청자가 "이거 완전 내 얘기잖아" 하고 몰입하게 만드는 법은?',
  '경쟁 채널과 손잡는 게 나을까, 각자 가는 게 나을까?',
  '악플 다는 사람을 오히려 팬으로 만드는 방법은?',
  '채널 아트 하나로 "전문가다" 싶게 만드는 법은?',
];

export default function TruthRoomPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/truth-room')
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setUsername(d.username || '');
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(content: string) {
    if (!content.trim() || sending) return;
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
      <p className="text-sm text-muted mb-6">듣기 좋은 말 말고, 진짜 조언 — 도플러에게 뭐든 물어보세요.</p>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div>
            <p className="text-lg font-black mb-1">반갑습니다, {username}님.</p>
            <p className="text-sm text-muted mb-6">궁금한 건 뭐든 도플러에게 던져보세요.</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="text-left text-xs border border-border rounded-[var(--radius-card-sm)] px-3 py-2.5 hover:border-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
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
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="채널 고민, 도플러한테 편하게 물어보세요"
          className="flex-1 border border-border rounded-[var(--radius-card-sm)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="bg-accent text-white font-bold rounded-[var(--radius-card-sm)] px-5 py-2 text-sm disabled:opacity-40"
        >
          보내기
        </button>
      </div>
      <p className="text-[10px] text-muted mt-2">질문과 답변은 직언의방 서비스 개선을 위해 수집될 수 있습니다.</p>
    </div>
  );
}
