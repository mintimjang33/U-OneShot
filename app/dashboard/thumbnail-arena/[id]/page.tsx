'use client';

import { useEffect, useState, use as usePromise } from 'react';

type Project = { id: string; image_urls: string[]; winner_url: string | null; status: string };

export default function ThumbnailArenaProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  // round: 이번 라운드에서 아직 겨루지 않은 후보들. pair: 지금 화면에 보여줄 두 장.
  const [round, setRound] = useState<string[]>([]);
  const [nextRound, setNextRound] = useState<string[]>([]);
  const [pair, setPair] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/thumbarena/${id}`)
      .then((r) => r.json())
      .then((d: { project: Project }) => {
        setProject(d.project);
        if (d.project.status === 'voting') {
          const shuffled = [...d.project.image_urls].sort(() => Math.random() - 0.5);
          setRound(shuffled.slice(2));
          setPair(shuffled.slice(0, 2));
          setNextRound([]);
        }
      });
  }, [id]);

  async function pick(winner: string) {
    const updatedNextRound = [...nextRound, winner];

    if (round.length >= 2) {
      setPair(round.slice(0, 2));
      setRound(round.slice(2));
      setNextRound(updatedNextRound);
      return;
    }

    // 이번 라운드 끝. 다음 라운드로 넘어가거나, 1장 남았으면 최종 우승.
    if (updatedNextRound.length === 1) {
      setSaving(true);
      const res = await fetch(`/api/thumbarena/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerUrl: updatedNextRound[0] }),
      });
      const data = await res.json();
      setSaving(false);
      if (res.ok) setProject(data.project);
      return;
    }

    setPair(updatedNextRound.slice(0, 2));
    setRound(updatedNextRound.slice(2));
    setNextRound([]);
  }

  if (!project) return <div className="text-sm text-muted">불러오는 중...</div>;

  if (project.status === 'done' && project.winner_url) {
    return (
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-black mb-6">🏆 우승 썸네일</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={project.winner_url} alt="우승" className="w-full max-w-md mx-auto rounded-[var(--radius-card)] border border-border" />
      </div>
    );
  }

  const totalLeft = round.length + pair.length + nextRound.length;

  return (
    <div className="max-w-3xl text-center">
      <h1 className="text-2xl font-black mb-1">썸네일 이상형 월드컵</h1>
      <p className="text-sm text-muted mb-8">더 끌리는 쪽을 골라주세요 (남은 후보 {totalLeft}장)</p>

      <div className="grid grid-cols-2 gap-6">
        {pair.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => pick(url)}
            disabled={saving}
            className="border-2 border-border rounded-[var(--radius-card)] overflow-hidden hover:border-accent disabled:opacity-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="후보" className="w-full aspect-video object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
