"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Smile, Frown, Meh, Heart, Zap, AlertCircle } from "lucide-react";

interface EmotionResult {
  anger: number;
  disgust: number;
  fear: number;
  happiness: number;
  neutral: number;
  sadness: number;
  surprise: number;
}

interface FaceData {
  emotions: EmotionResult;
  age: number;
  gender: string;
}

const LUXAND_API_KEY = "08c13974de9747568db5cffaf2c85018";

const EMOTION_COLORS: Record<string, string> = {
  happiness: "from-yellow-400 to-orange-400",
  sadness: "from-blue-400 to-indigo-500",
  anger: "from-red-400 to-pink-500",
  surprise: "from-purple-400 to-pink-400",
  fear: "from-gray-400 to-slate-500",
  disgust: "from-green-400 to-teal-500",
  neutral: "from-gray-300 to-gray-400",
};

const EMOTION_ICONS: Record<string, any> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  surprise: "😲",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
};

export default function EmotionRecognition() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FaceData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
      setError(null);
    } catch (err) {
      setError("Failed to access camera. Please grant camera permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setImage(imageData);
        stopCamera();
        analyzeEmotion(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setImage(imageData);
        analyzeEmotion(imageData);
      };
      reader.readAsDataURL(file);
    }
  };
  const analyzeEmotion = async (imageData: string) => {
    setLoading(true);
    setError(null);
    setResults([]);
  
    try {
      // Convert base64 to Blob
      const base64Data = imageData.split(",")[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());
  
      const formData = new FormData();
      formData.append("photo", blob, "photo.jpg");
  
      // Call your Next.js API route
      const response = await fetch("/api/emotion", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("Failed to analyze emotion");
      }
  
      const data = await response.json();
  
      // Map Luxand API response to frontend structure
      if (data.faces && data.faces.length > 0) {
        const mappedFaces = data.faces.map((face: any) => ({
          emotions: {
            happiness: face.emotion.happy,
            sadness: face.emotion.sad,
            anger: face.emotion.angry,
            surprise: face.emotion.surprise,
            fear: face.emotion.fear,
            disgust: face.emotion.disgust,
            neutral: face.emotion.neutral,
          },
          age: face.age || 0,      // Luxand may not provide age
          gender: face.gender || "unknown",
        }));
  
        setResults(mappedFaces);
      } else {
        setError("No faces detected. Try another photo.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze emotion");
    } finally {
      setLoading(false);
    }
  };
  
  

  const getDominantEmotion = (emotions: EmotionResult) => {
    const emotionEntries = Object.entries(emotions);
    const sorted = emotionEntries.sort((a, b) => b[1] - a[1]);
    return sorted[0];
  };

  const reset = () => {
    setImage(null);
    setResults([]);
    setError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-3xl shadow-lg mb-4">
            <Smile className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Emotion Recognition
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload a photo or take a selfie to detect emotions using AI-powered facial analysis
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {!image && !showCamera ? (
            // Upload Options
            <div className="p-12">
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                  onClick={startCamera}
                  className="group relative bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl p-8 shadow-lg transition-all transform hover:scale-105"
                >
                  <Camera className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Take Photo</h3>
                  <p className="text-purple-100">Use your camera</p>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl p-8 shadow-lg transition-all transform hover:scale-105"
                >
                  <Upload className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Upload Photo</h3>
                  <p className="text-blue-100">Choose from device</p>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : showCamera ? (
            // Camera View
            <div className="p-6">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={capturePhoto}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105"
                >
                  <Camera className="inline w-5 h-5 mr-2" />
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105"
                >
                  <X className="inline w-5 h-5 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Results View
            <div className="p-6">
              {/* Preview Image */}
              <div className="relative mb-6">
                <img
                  src={image!}
                  alt="Uploaded"
                  className="w-full max-h-96 object-contain rounded-2xl"
                />
                <button
                  onClick={reset}
                  className="absolute top-4 right-4 bg-white hover:bg-gray-100 text-gray-700 p-3 rounded-full shadow-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
                  <p className="text-gray-600 font-medium">Analyzing emotions...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
                    Detected Emotions
                  </h2>

                  {results.map((face, index) => {
                    const [dominantEmotion, dominantValue] = getDominantEmotion(face.emotions);
                    const emotionEntries = Object.entries(face.emotions).sort(
                      (a, b) => b[1] - a[1]
                    );

                    return (
                      <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg">
                        {/* Dominant Emotion */}
                        <div className="text-center mb-8">
                          <div
                            className={`inline-block bg-gradient-to-r ${EMOTION_COLORS[dominantEmotion]} p-6 rounded-3xl shadow-lg mb-4`}
                          >
                            <span className="text-6xl">
                              {EMOTION_ICONS[dominantEmotion]}
                            </span>
                          </div>
                          <h3 className="text-3xl font-bold text-gray-800 capitalize mb-2">
                            {dominantEmotion}
                          </h3>
                          <p className="text-gray-600 text-lg">
                            Dominant Emotion: {(dominantValue * 100).toFixed(1)}%
                          </p>
                          {face.age && (
                            <p className="text-gray-500 mt-2">
                              Estimated Age: {Math.round(face.age)} • Gender: {face.gender}
                            </p>
                          )}
                        </div>

                        {/* All Emotions */}
                        <div className="space-y-4">
                          <h4 className="text-xl font-bold text-gray-700 mb-4">
                            All Detected Emotions:
                          </h4>
                          {emotionEntries.map(([emotion, value]) => (
                            <div key={emotion} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">
                                    {EMOTION_ICONS[emotion]}
                                  </span>
                                  <span className="font-medium capitalize text-gray-700">
                                    {emotion}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-800">
                                  {(value * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${EMOTION_COLORS[emotion]} rounded-full transition-all duration-500`}
                                  style={{ width: `${value * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Try Another Button */}
                  <div className="text-center">
                    <button
                      onClick={reset}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-12 rounded-xl shadow-lg transform transition hover:scale-105"
                    >
                      Try Another Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">
            Powered by Luxand Cloud API • AI Facial Analysis
          </p>
          <p className="text-sm">
            Your photos are processed securely and not stored on our servers
          </p>
        </div>
      </div>
    </div>
  );
}