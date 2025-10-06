
"use client";

import AudioButton from "../components/Audiobutton";

export default function AudioChatPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Audio Chat</h1>
      <AudioButton />
    </div>
  );
}
