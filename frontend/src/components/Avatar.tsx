import React from "react";

type AgentState = "idle" | "listening" | "thinking" | "speaking" | "disconnected";

interface AvatarProps {
  state: AgentState;
  volume?: number;
}

export default function Avatar({ state, volume = 0 }: AvatarProps) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isThinking = state === "thinking";

  const ringColor =
    isSpeaking
      ? "rgba(99,102,241,0.6)"
      : isListening
      ? "rgba(34,197,94,0.5)"
      : isThinking
      ? "rgba(251,191,36,0.5)"
      : "rgba(100,116,139,0.3)";

  const ringScale = isSpeaking ? 1 + volume * 0.15 : 1;

  const stateLabel =
    state === "idle"
      ? "Ready"
      : state === "listening"
      ? "Listening…"
      : state === "thinking"
      ? "Thinking…"
      : state === "speaking"
      ? "Speaking"
      : "Disconnected";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute rounded-full transition-all duration-150"
          style={{
            width: 200,
            height: 200,
            background: ringColor,
            transform: `scale(${ringScale})`,
            filter: "blur(16px)",
          }}
        />

        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <circle cx="90" cy="90" r="80" fill="#1e1e2e" stroke="#6366f1" strokeWidth="3" />

          <circle cx="90" cy="90" r="68" fill="#252535" />

          <g className={isSpeaking ? "animate-pulse2" : ""}>
            <circle cx="68" cy="78" r="6" fill="#94a3b8" />
            <circle cx="112" cy="78" r="6" fill="#94a3b8" />

            <ellipse
              cx="68"
              cy="78"
              rx="6"
              ry={isListening ? 1 : 6}
              fill="#e2e8f0"
              style={{
                transformOrigin: "68px 78px",
                animation: state === "idle" ? "blink 3s infinite" : undefined,
                transform: `scaleY(${isListening ? 0.1 : 1})`,
                transition: "transform 0.2s",
              }}
            />
            <ellipse
              cx="112"
              cy="78"
              rx="6"
              ry={isListening ? 1 : 6}
              fill="#e2e8f0"
              style={{
                transformOrigin: "112px 78px",
                animation: state === "idle" ? "blink 3s infinite 0.15s" : undefined,
                transform: `scaleY(${isListening ? 0.1 : 1})`,
                transition: "transform 0.2s",
              }}
            />

            <circle cx="65" cy="76" r="2" fill="#1e1e2e" />
            <circle cx="109" cy="76" r="2" fill="#1e1e2e" />
          </g>

          {isSpeaking ? (
            <ellipse
              cx="90"
              cy="112"
              rx="20"
              ry={8 + volume * 12}
              fill="#6366f1"
              style={{
                transition: "ry 0.1s ease-out",
                transformOrigin: "90px 112px",
              }}
            />
          ) : isThinking ? (
            <>
              <circle cx="75" cy="112" r="4" fill="#fbbf24" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="112" r="4" fill="#fbbf24" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="105" cy="112" r="4" fill="#fbbf24" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
              </circle>
            </>
          ) : (
            <path
              d="M70 112 Q90 122 110 112"
              stroke="#94a3b8"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {isListening && (
            <>
              <circle cx="20" cy="90" r="4" fill="#22c55e" opacity="0.7">
                <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="160" cy="90" r="4" fill="#22c55e" opacity="0.7">
                <animate attributeName="r" values="4;7;4" dur="1s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1s" begin="0.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isSpeaking
              ? "bg-indigo-400 animate-pulse"
              : isListening
              ? "bg-green-400 animate-pulse"
              : isThinking
              ? "bg-yellow-400 animate-pulse"
              : "bg-slate-500"
          }`}
        />
        <span className="text-sm font-medium text-slate-300">{stateLabel}</span>
      </div>
    </div>
  );
}
