import React, { useMemo } from 'react';
import type { SelfieItem } from '../../lib/selfieTypes';

const emotions: Array<{ key: SelfieItem['emotion']; label: string; color: string }> = [
  { key: 'happy', label: 'Happy', color: 'bg-green-500' },
  { key: 'sad', label: 'Sad', color: 'bg-blue-500' },
  { key: 'angry', label: 'Angry', color: 'bg-red-500' },
  { key: 'surprised', label: 'Surprised', color: 'bg-yellow-400' },
  { key: 'neutral', label: 'Neutral', color: 'bg-gray-400' },
  { key: 'fear', label: 'Fear', color: 'bg-purple-500' },
  { key: 'disgust', label: 'Disgust', color: 'bg-lime-500' },
];

export default function EmotionChart({ selfies }: { selfies: SelfieItem[] }) {
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    emotions.forEach(e => (acc[e.key] = 0));
    for (const s of selfies || []) acc[s.emotion] = (acc[s.emotion] || 0) + 1;
    const max = Math.max(1, ...Object.values(acc));
    return { acc, max };
  }, [selfies]);

  return (
    <div className="space-y-2">
      {emotions.map(e => {
        const value = counts.acc[e.key] || 0;
        const width = `${(value / counts.max) * 100}%`;
        return (
          <div key={e.key} className="text-sm">
            <div className="flex justify-between mb-1">
              <span>{e.label}</span>
              <span className="text-gray-500">{value}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded">
              <div className={`h-3 ${e.color} rounded`} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
