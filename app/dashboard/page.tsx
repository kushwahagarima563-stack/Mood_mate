'use client'
import React, { useEffect, useState } from "react";

type MusicLog = {
  id: string;
  emotion: string;
  weather: string;
  song_title: string;
  song_id: string;
  played_at: string;
};

type FaceEmotionLog = {
  id: string;
  userId?: string;
  imageUrl?: string;
  apiResponse: any;
  createdAt: string;
};

export default function DashboardPage() {
  const [musicLogs, setMusicLogs] = useState<MusicLog[]>([]);
  const [faceEmotionLogs, setFaceEmotionLogs] = useState<FaceEmotionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/musiclogs/logs")
      .then((res) => res.json())
      .then((data) => {
        setMusicLogs(data.musicLogs);
        setFaceEmotionLogs(data.faceEmotionLogs);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center mt-10">Loading logs...</p>;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">AI Journal Dashboard</h1>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">🎵 Music Logs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {musicLogs.map((log) => (
            <div key={log.id} className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
              <p><strong>Song:</strong> {log.song_title}</p>
              <p><strong>Emotion:</strong> {log.emotion}</p>
              <p><strong>Weather:</strong> {log.weather}</p>
              <p className="text-sm text-gray-500">Played at: {new Date(log.played_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">😊 Face Emotion Logs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faceEmotionLogs.map((log) => (
            <div key={log.id} className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
              {log.imageUrl && <img src={log.imageUrl} alt="Selfie" className="w-full h-40 object-cover rounded mb-2" />}
              <p><strong>User ID:</strong> {log.userId || "Anonymous"}</p>
              <p><strong>Emotions:</strong> {JSON.stringify(log.apiResponse)}</p>
              <p className="text-sm text-gray-500">Logged at: {new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
