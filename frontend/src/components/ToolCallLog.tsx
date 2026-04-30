import React from "react";

export interface ToolEvent {
  id: string;
  type: "tool_call" | "tool_result";
  name: string;
  status: "running" | "done" | "error";
  message: string;
  timestamp: string;
}

const TOOL_LABELS: Record<string, string> = {
  identify_user:        "Identify User",
  update_user_name:     "Save Name",
  fetch_slots:          "Fetch Slots",
  book_appointment:     "Book Appointment",
  retrieve_appointments:"View Appointments",
  cancel_appointment:   "Cancel Appointment",
  modify_appointment:   "Modify Appointment",
  end_conversation:     "End Conversation",
};

const STATUS_STYLES: Record<string, string> = {
  running: "text-yellow-700 bg-yellow-50 border-yellow-200",
  done:    "text-green-700 bg-green-50 border-green-200",
  error:   "text-red-700 bg-red-50 border-red-200",
};

const STATUS_DOT: Record<string, string> = {
  running: "bg-yellow-400",
  done:    "bg-green-500",
  error:   "bg-red-500",
};

export default function ToolCallLog({ events }: { events: ToolEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <p className="text-xs text-gray-400">Tool calls will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {[...events].reverse().map((evt) => (
        <div key={evt.id} className={`rounded-lg border px-3 py-2 text-xs ${STATUS_STYLES[evt.status]}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[evt.status]}`} />
            <span className="font-medium">{TOOL_LABELS[evt.name] ?? evt.name}</span>
          </div>
          <p className="text-xs leading-relaxed opacity-80">{evt.message}</p>
          <p className="text-xs mt-1 opacity-40">{evt.timestamp}</p>
        </div>
      ))}
    </div>
  );
}
