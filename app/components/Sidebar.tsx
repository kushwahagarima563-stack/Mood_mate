'use client';

import { useEffect, useState, useMemo } from 'react';
import { Session } from '@prisma/client';
import { Plus, MessageSquare, Calendar, Clock, ChevronRight, Sparkles } from 'lucide-react';

interface SidebarProps {
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ onSessionSelect, onNewChat }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSessions(data);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
      setLoading(false);
    };
    fetchSessions();
  }, []);

  const handleSessionClick = (sessionId: string) => {
    setSelectedSession(sessionId);
    onSessionSelect(sessionId);
  };

  const handleNewChat = () => {
    setSelectedSession(null);
    onNewChat();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const groupedSessions = useMemo(() => {
    const grouped: { [key: string]: Session[] } = {};
    if (Array.isArray(sessions)) {
      sessions.forEach(session => {
        if (session && session.createdAt) {
          const dateKey = formatDate(session.createdAt.toString());
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(session);
        }
      });
    }
    return grouped;
  }, [sessions]);

  return (
    <div className="w-80 bg-gradient-to-br from-purple-50 to-pink-50 border-r border-purple-100 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-purple-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Journal Sessions</h2>
            <p className="text-xs text-gray-500">{sessions.length} conversations</p>
          </div>
        </div>
        
        <button
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          New Journal Entry
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading your journals...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">No journals yet</h3>
            <p className="text-sm text-gray-500">
              Start your first journal entry to begin tracking your emotions
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([date, dateSessions]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2 px-2 mb-3">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {date}
                </h3>
              </div>
              
              {dateSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`group cursor-pointer p-4 rounded-xl transition-all ${
                    selectedSession === session.id
                      ? 'bg-white shadow-md border-2 border-purple-300'
                      : 'bg-white/60 hover:bg-white hover:shadow-sm border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                          selectedSession === session.id ? 'text-purple-500' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium truncate ${
                          selectedSession === session.id ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          Session {session.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.createdAt.toString())}
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all ${
                      selectedSession === session.id 
                        ? 'text-purple-500 translate-x-1' 
                        : 'text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-purple-100 bg-white/50 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Your safe space for emotional wellness
          </p>
        </div>
      </div>
    </div>
  );
}