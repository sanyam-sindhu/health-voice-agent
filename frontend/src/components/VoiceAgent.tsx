import React, { useCallback, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";

import TalkingAvatar from "./TalkingAvatar";
import ToolCallLog, { ToolEvent } from "./ToolCallLog";
import CallSummary, { SummaryData } from "./CallSummary";
import SummaryHistory from "./SummaryHistory";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function fetchSummaryWithRetry(sessionId: string, maxAttempts = 6): Promise<SummaryData | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const resp = await fetch(`${API_BASE}/summary/${sessionId}`);
      if (resp.ok) return await resp.json();
    } catch (_) {}
  }
  return null;
}

async function generateFallbackSummary(sessionId: string): Promise<SummaryData | null> {
  try {
    const resp = await fetch(`${API_BASE}/summary/generate/${sessionId}`, { method: "POST" });
    if (resp.ok) return await resp.json();
  } catch (_) {}
  return null;
}

interface ConnectedRoomProps {
  sessionId: string;
  onEvent: (evt: ToolEvent) => void;
  onSummary: (data: SummaryData) => void;
  onDisconnect: () => void;
}

function ConnectedRoom({ sessionId, onEvent, onSummary, onDisconnect }: ConnectedRoomProps) {
  const { localParticipant } = useLocalParticipant();
  const [ending, setEnding] = useState(false);

  const { send } = useDataChannel((msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as Record<string, unknown>;
      if (data.type === "summary") {
        onSummary(data as unknown as SummaryData);
        setTimeout(onDisconnect, 1500);
      } else {
        onEvent({
          id: `${Date.now()}-${Math.random()}`,
          type: data.type as "tool_call" | "tool_result",
          name: data.name as string,
          status: data.status as "running" | "done" | "error",
          message: data.message as string,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (_) {}
  });

  const handleEndCall = async () => {
    setEnding(true);
    try {
      await localParticipant.publishData(
        new TextEncoder().encode(
          JSON.stringify({ type: "user_message", text: "Goodbye, please end the conversation and generate a summary." })
        ),
        { reliable: true }
      );
    } catch (_) {}

    let summary = await fetchSummaryWithRetry(sessionId);
    if (!summary) summary = await generateFallbackSummary(sessionId);
    if (summary) {
      onSummary(summary);
      setTimeout(onDisconnect, 800);
    } else {
      onDisconnect();
    }
  };

  return (
    <>
      <RoomAudioRenderer />
      <div className="flex flex-col items-center gap-5">
        <TalkingAvatar />
        <p className="text-sm text-gray-500">Your assistant is listening — speak naturally</p>
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="flex items-center gap-2 px-5 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {ending ? (
            <>
              <span className="h-3 w-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
              Generating summary…
            </>
          ) : (
            "End Call"
          )}
        </button>
      </div>
    </>
  );
}

export default function VoiceAgent() {
  const [connectionData, setConnectionData] = useState<{
    token: string;
    url: string;
    room: string;
  } | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const sessionIdRef = useRef<string>("");

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/connect`, { method: "POST" });
      if (!resp.ok) throw new Error("Failed to connect");
      const data = await resp.json();
      sessionIdRef.current = data.room;
      setConnectionData(data);
      setConnected(true);
      setEvents([]);
      setSummary(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setConnectionData(null);
  }, []);

  const handleEvent = useCallback((evt: ToolEvent) => {
    setEvents((prev) => [...prev, evt]);
  }, []);

  const handleSummary = useCallback((data: SummaryData) => {
    setSummary(data);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div>
          <h1 className="text-gray-900 font-semibold text-sm leading-none">Healthcare Assistant</h1>
          <p className="text-gray-400 text-xs mt-0.5">AI Front Desk</p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors focus:outline-none"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
          </svg>
          History
        </button>
        {connected && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-green-700 text-xs font-medium">Connected</span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-col items-center justify-center flex-1 p-8">
          {!connected ? (
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </div>
              <div>
                <h2 className="text-gray-900 text-xl font-semibold">Book an Appointment</h2>
                <p className="text-gray-500 text-sm mt-1">Talk to our AI assistant to schedule, modify, or cancel your appointments.</p>
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2 w-full">
                  {error}
                </p>
              )}
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {connecting ? "Connecting…" : "Start Call"}
              </button>
            </div>
          ) : (
            connectionData && (
              <LiveKitRoom
                token={connectionData.token}
                serverUrl={connectionData.url}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={handleDisconnect}
                className="flex items-center justify-center w-full h-full"
              >
                <ConnectedRoom
                  sessionId={sessionIdRef.current}
                  onEvent={handleEvent}
                  onSummary={handleSummary}
                  onDisconnect={handleDisconnect}
                />
              </LiveKitRoom>
            )
          )}
        </main>

        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tool Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ToolCallLog events={events} />
          </div>
        </aside>
      </div>

      {summary && <CallSummary data={summary} onDismiss={() => setSummary(null)} />}
      {showHistory && <SummaryHistory onClose={() => setShowHistory(false)} />}
    </div>
  );
}
