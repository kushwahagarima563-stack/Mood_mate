"use client";
import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// Generate a unique session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export default function AudioButton() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof MediaRecorder !== "undefined";
    setBrowserSupported(supported);
    
    // Initialize session ID
    if (!sessionId) {
      setSessionId(generateSessionId());
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      clearInterval(interval);
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  function resetComponent() {
    setResult(null);
    setError(null);
    setRecording(false);
    setProcessing(false);
    setRecordingTime(0);
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
  }

  async function startRecording() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || "Microphone permission denied or unsupported browser.");
    }
  }

  async function stopRecordingAndUpload() {
    const mr = mediaRecorderRef.current;
    if (!mr) {
      setError("Recorder not initialized.");
      return;
    }
    setProcessing(true);
    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          
          if (blob.size < 2000) {
            setError("Recording too short. Please record for at least 1 second.");
            setProcessing(false);
            resolve();
            return;
          }

          console.log("Session ID:", sessionId);
          console.log("Blob size:", blob.size);

          // 1) Upload raw audio
          const formData = new FormData();
          formData.append("file", blob, "speech.webm");
          formData.append("sessionId", sessionId);
          
          console.log("Uploading to /api/audio/upload...");
          const uploadResp = await fetch("/api/audio/upload", { 
            method: "POST", 
            body: formData 
          });
          
          if (!uploadResp.ok) {
            const t = await uploadResp.text();
            console.error("Upload failed:", t);
            throw new Error(t || `Upload failed: ${uploadResp.status}`);
          }
          
          const uploadData = await uploadResp.json();
          console.log("Upload response:", uploadData);

          // 2) Voice pipeline (STT + analysis + LLM + TTS)
          const voicePayload = {
            sessionId: sessionId,
            pathOrUrl: uploadData.storagePath || uploadData.signedUrl,
          };
          
          console.log("Calling /api/voice with payload:", voicePayload);
          
          const voiceResp = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(voicePayload),
          });
          
          if (!voiceResp.ok) {
            const t = await voiceResp.text();
            console.error("Voice pipeline failed:", t);
            throw new Error(t || `Voice pipeline failed: ${voiceResp.status}`);
          }
          
          const data = await voiceResp.json();
          console.log("Voice response:", data);

          if (data?.ttsAudioUrl) {
            const audio = new Audio(data.ttsAudioUrl);
            audio.play().catch((err) => {
              console.error("Audio playback failed:", err);
            });
          }

          setResult(data);
          setError(null);
        } catch (e: any) {
          console.error("Error in stopRecordingAndUpload:", e);
          setError(e?.message || "Failed to analyze audio. Please try again.");
        } finally {
          setProcessing(false);
          resolve();
        }
      };
      mediaRecorderRef.current.stop();
      setRecording(false);
    });
  }

  if (!browserSupported) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">Your browser doesn't support audio recording.</p>
            <p className="text-sm text-red-600 mt-1">Please use a modern browser like Chrome, Firefox, or Edge.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col items-center gap-4">
          {!recording && !processing && !result && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start recording"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          )}

          {recording && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-2xl font-mono font-bold text-gray-800">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecordingAndUpload}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                aria-label="Stop recording"
              >
                <Square className="w-5 h-5" />
                Stop & Analyze
              </button>
            </div>
          )}

          {processing && (
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">Processing audio...</span>
            </div>
          )}

          {result && (
            <button
              onClick={resetComponent}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Record Again
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Analysis Complete</h3>
          </div>

          {result.transcript && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Transcript</h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{result.transcript}</p>
              </div>
            </div>
          )}

          {result.emotions && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Emotional Analysis</h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-sm text-gray-700 overflow-x-auto">{JSON.stringify(result.emotions, null, 2)}</pre>
              </div>
            </div>
          )}

          {result.assistantText && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">AI Response</h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{result.assistantText}</p>
              </div>
            </div>
          )}

          {result.ttsAudioUrl && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">AI Audio</h4>
              <audio src={result.ttsAudioUrl} controls preload="none" className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}