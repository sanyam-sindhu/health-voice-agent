import React from "react";
import { useVoiceAssistant, useMultibandTrackVolume, VideoTrack } from "@livekit/components-react";

type AgentState = "idle" | "listening" | "thinking" | "speaking";

function mapState(s: string | undefined): AgentState {
  if (s === "listening") return "listening";
  if (s === "thinking")  return "thinking";
  if (s === "speaking")  return "speaking";
  return "idle";
}

const STATE_LABEL: Record<AgentState, string> = {
  idle:      "Ready",
  listening: "Listening",
  thinking:  "Processing",
  speaking:  "Speaking",
};

const STATE_DOT: Record<AgentState, string> = {
  idle:      "bg-gray-300",
  listening: "bg-green-500",
  thinking:  "bg-yellow-400",
  speaking:  "bg-blue-500",
};

export default function TalkingAvatar() {
  const { state: lkState, agentAudioTrack, videoTrack } = useVoiceAssistant();
  const state    = mapState(lkState);
  const hasVideo = !!videoTrack?.publication?.track;

  const bands = useMultibandTrackVolume(agentAudioTrack, {
    bands: 5,
    loPass: 100,
    hiPass: 500,
    updateInterval: 40,
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="overflow-hidden bg-gray-100 border border-gray-200 rounded-2xl"
        style={{ width: 300, height: 340 }}
      >
        {hasVideo && videoTrack ? (
          <VideoTrack
            trackRef={videoTrack}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50">
            <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
            <p className="text-xs text-gray-400">Connecting avatar…</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
          <span className="text-xs text-gray-500 font-medium">{STATE_LABEL[state]}</span>
        </div>

        {state === "speaking" && (
          <div className="flex items-end gap-0.5 h-4">
            {bands.map((b, i) => (
              <div
                key={i}
                className="rounded-sm bg-blue-400"
                style={{ width: 3, height: Math.max(3, b * 16), transition: "height 50ms ease-out" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

