'use client'
  import { useState, useEffect, useRef } from 'react';
  import { Send, Sparkles, Heart } from 'lucide-react';
  import Sidebar from './components/Sidebar';
  import AudioButton from './components/Audiobutton';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

  export default function Page() {
    const [history, setHistory] = useState<Message[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).currentSessionId = sessionId;
  }, [sessionId]);

  const handleSessionSelect = async (sessionId: string) => {
    setSessionId(sessionId);
    const res = await fetch(`/api/sessions/${sessionId}`);
    const data = await res.json();
    const formattedHistory = data.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
    setHistory(formattedHistory);
  };

  const handleNewChat = () => {
    setSessionId(null);
    setHistory([]);
    setMessage('');
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const newMessage: Message = { role: 'user', parts: [{ text: message }] };
    setHistory((prev) => [...prev, newMessage]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message, sessionId }),
      });

      const data = await res.json();

      if (data.text) {
        const modelMessage: Message = { role: 'model', parts: [{ text: data.text }] };
        setHistory((prev) => [...prev, modelMessage]);
      }
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [history]);

  // Ensure a persistent sessionId is available to voice pipeline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sid = sessionId;
    try {
      if (!sid) {
        sid = localStorage.getItem('sessionId');
      }
      if (!sid) {
        const gen = (crypto as any)?.randomUUID
          ? (crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sid = gen;
        localStorage.setItem('sessionId', sid);
      }
      (window as any).currentSessionId = sid;
      if (!sessionId) setSessionId(sid);
    } catch {}
  }, [sessionId]);

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen">
      <Sidebar onSessionSelect={handleSessionSelect} onNewChat={handleNewChat} />
      <div className="flex flex-col flex-1 bg-gradient-to-br from-brand-50 via-accent-50 to-brand-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-brand-100">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-500 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
                 MoodMate
                  </h1>
                  <p className="text-xs text-gray-500">Your emotional companion</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 font-medium">{formatTime()}</div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div ref={chatHistoryRef} className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50">
  <div className="space-y-6">
    {history.length === 0 && (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Welcome to your journal
        </h2>
        <p className="text-gray-600 max-w-md">
          Share your thoughts, feelings, and emotions. I'm here to listen and support you.
        </p>
      </div>
    )}

    {history.map((msg, index) => (
      <div
        key={index}
        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
      >
        <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          {msg.role === 'model' && (
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          <div
            className={`px-5 py-3 rounded-2xl shadow-md ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white'
                : 'bg-white text-gray-900 rounded-bl-md border border-brand-200'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
            <span className={`text-xs mt-1 block ${msg.role === 'user' ? 'text-brand-200' : 'text-gray-400'}`}>
              {formatTime()}
            </span>
          </div>
        </div>
      </div>
    ))}

    {loading && (
      <div className="flex justify-start animate-fadeIn">
        <div className="flex items-end gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="px-5 py-3 rounded-2xl rounded-bl-md bg-white border border-brand-200 shadow-md">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</div>


        {/* Input Area with Text/Voice toggle */}
        <div className="bg-white/80 backdrop-blur-lg border-t border-brand-100 shadow-lg">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'text' ? 'bg-white text-brand-700 shadow' : 'text-gray-600'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setInputMode('voice')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'voice' ? 'bg-white text-brand-700 shadow' : 'text-gray-600'
                  }`}
                >
                  Voice
                </button>
              </div>
            </div>

            {inputMode === 'text' ? (
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-brand-100 rounded-2xl focus:outline-none focus:border-brand-300 focus:bg-white transition-all text-gray-800 placeholder-gray-400"
                    placeholder="How are you feeling today?"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-medium"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="">
                <AudioButton />
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}