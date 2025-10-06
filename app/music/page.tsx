"use client";

import { useEffect, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Cloud, CloudRain, Sun, Wind, Music, Heart } from "lucide-react";

// Mock Supabase client (replace with your actual implementation)
const supabase = {
  from: (table: string) => ({
    insert: async (data: any) => {
      console.log("Logging to Supabase:", data);
      // Actual API call
      try {
        await fetch('/api/musiclogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data[0])
        });
      } catch (err) {
        console.error("Error logging:", err);
      }
      return { data, error: null };
    }
  })
};

const EMOTION_OPTIONS = [
  { value: "happy", label: "Happy", emoji: "😊", color: "from-yellow-400 to-orange-400" },
  { value: "sad", label: "Sad", emoji: "😢", color: "from-blue-400 to-indigo-500" },
  { value: "angry", label: "Angry", emoji: "😤", color: "from-red-400 to-pink-500" },
  { value: "neutral", label: "Neutral", emoji: "😐", color: "from-gray-400 to-slate-500" },
  { value: "excited", label: "Excited", emoji: "🤩", color: "from-purple-400 to-pink-500" },
  { value: "relaxed", label: "Relaxed", emoji: "😌", color: "from-green-400 to-teal-500" }
];

const WEATHER_ICONS: any = {
  clear: <Sun className="w-6 h-6" />,
  clouds: <Cloud className="w-6 h-6" />,
  rain: <CloudRain className="w-6 h-6" />,
  default: <Wind className="w-6 h-6" />
};

export default function MusicPage() {
  const [emotion, setEmotion] = useState<string>("neutral");
  const [weather, setWeather] = useState<string>("clear");
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  async function getWeather() {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      // Note: You'll need to add your weather API key
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=YOUR_API_KEY&units=metric`
      );
      const data = await res.json();
      const currentWeather = data.weather[0].main.toLowerCase();
      setWeather(currentWeather);
      return currentWeather;
    } catch (err) {
      console.error("Weather error:", err);
      setWeather("clear");
      return "clear";
    }
  }

  function generateQuery(emo: string, wthr: string) {
    if (emo === "happy" && wthr === "clear") return "happy upbeat summer songs";
    if (emo === "sad" && wthr === "rain") return "sad rainy lo fi chill";
    if (emo === "angry") return "calming instrumental music";
    if (emo === "neutral" && wthr === "clouds") return "chill ambient music";
    return `${emo} ${wthr} mood music`;
  }

  async function fetchSongs(query: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      const songList = data.items?.map((item: any) => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.medium.url,
      })) || [];
      
      setSongs(songList);
      if (songList.length > 0 && !currentSong) {
        setCurrentSong(songList[0]);
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
    }
    setLoading(false);
  }

  async function logSongPlay(song: any) {
    await supabase.from("music_logs").insert([
      {
        emotion,
        weather,
        song_title: song.title,
        song_id: song.videoId,
        played_at: new Date().toISOString(),
      },
    ]);
  }

  const handlePlaySong = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
    logSongPlay(song);
  };

  const handleNextSong = () => {
    const currentIndex = songs.findIndex(s => s.videoId === currentSong?.videoId);
    if (currentIndex < songs.length - 1) {
      const nextSong = songs[currentIndex + 1];
      handlePlaySong(nextSong);
    }
  };

  const handlePrevSong = () => {
    const currentIndex = songs.findIndex(s => s.videoId === currentSong?.videoId);
    if (currentIndex > 0) {
      const prevSong = songs[currentIndex - 1];
      handlePlaySong(prevSong);
    }
  };

  const toggleFavorite = (videoId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(videoId)) {
      newFavorites.delete(videoId);
    } else {
      newFavorites.add(videoId);
    }
    setFavorites(newFavorites);
  };

  useEffect(() => {
    getWeather();
  }, []);

  const handleLoadSongs = async () => {
    const query = generateQuery(emotion, weather);
    await fetchSongs(query);
  };

  const selectedEmotion = EMOTION_OPTIONS.find(e => e.value === emotion);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                <Music className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Mood Music
                </h1>
                <p className="text-sm text-gray-500">Music that matches your vibe</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-xl">
              <div className="text-indigo-600">
                {WEATHER_ICONS[weather] || WEATHER_ICONS.default}
              </div>
              <span className="font-semibold text-gray-700 capitalize">{weather}</span>
            </div>
          </div>

          {/* Emotion Selector */}
          <div className="flex flex-wrap gap-3 justify-center">
            {EMOTION_OPTIONS.map((emo) => (
              <button
                key={emo.value}
                onClick={() => setEmotion(emo.value)}
                className={`px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  emotion === emo.value
                    ? `bg-gradient-to-r ${emo.color} text-white shadow-lg`
                    : "bg-white text-gray-700 hover:bg-gray-50 shadow"
                }`}
              >
                <span className="mr-2">{emo.emoji}</span>
                {emo.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLoadSongs}
            className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105"
          >
            <Music className="inline w-5 h-5 mr-2" />
            Discover Music
          </button>
        </div>
      </div>

      {/* Current Player */}
      {currentSong && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="relative">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full aspect-video object-cover rounded-2xl shadow-lg"
                />
                <div className={`absolute top-4 right-4 bg-gradient-to-r ${selectedEmotion?.color} px-4 py-2 rounded-full text-white font-semibold shadow-lg`}>
                  {selectedEmotion?.emoji} {selectedEmotion?.label}
                </div>
              </div>
              
              <div className="flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {currentSong.title}
                  </h2>
                  <p className="text-gray-500 mb-4">Now Playing</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handlePrevSong}
                      className="bg-gray-100 hover:bg-gray-200 p-4 rounded-full transition"
                    >
                      <SkipBack className="w-6 h-6 text-gray-700" />
                    </button>
                    
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 p-6 rounded-full shadow-lg transition transform hover:scale-110"
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 text-white" />
                      ) : (
                        <Play className="w-8 h-8 text-white ml-1" />
                      )}
                    </button>
                    
                    <button
                      onClick={handleNextSong}
                      className="bg-gray-100 hover:bg-gray-200 p-4 rounded-full transition"
                    >
                      <SkipForward className="w-6 h-6 text-gray-700" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleFavorite(currentSong.videoId)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-50 hover:bg-pink-100 transition"
                  >
                    <Heart 
                      className={`w-5 h-5 ${favorites.has(currentSong.videoId) ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`}
                    />
                    <span className="font-medium text-gray-700">
                      {favorites.has(currentSong.videoId) ? 'Liked' : 'Like'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Player */}
            <div className="px-6 pb-6">
              <iframe
                width="100%"
                height="400"
                src={`https://www.youtube.com/embed/${currentSong.videoId}?autoplay=${isPlaying ? 1 : 0}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-2xl shadow-lg"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Song Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Finding perfect tracks...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Select your mood to discover music</p>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Recommended Tracks</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {songs.map((song) => (
                <div
                  key={song.videoId}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all transform hover:scale-105 hover:shadow-2xl cursor-pointer ${
                    currentSong?.videoId === song.videoId ? 'ring-4 ring-indigo-500' : ''
                  }`}
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="relative">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(song.videoId);
                      }}
                      className="absolute top-2 right-2 bg-white/90 p-2 rounded-full hover:bg-white transition"
                    >
                      <Heart 
                        className={`w-5 h-5 ${favorites.has(song.videoId) ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-gray-800 line-clamp-2 text-sm">
                      {song.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}