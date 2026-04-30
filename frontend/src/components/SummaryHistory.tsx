import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface StoredSummary {
  id: number;
  session_id: string;
  summary: string;
  appointments: Array<{ id: number; date: string; time: string; status: string }>;
  user_info: { id?: number; name?: string; phone?: string };
  metrics?: { duration_label?: string; tool_calls_total?: number; tool_breakdown?: Record<string, number> };
  created_at: string;
}

function SummaryCard({ s, onClose }: { s: StoredSummary; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 font-semibold text-base">Call Summary</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date(s.created_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {s.user_info?.phone && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400 w-14 flex-shrink-0 text-xs pt-0.5">Caller</span>
              <span className="text-gray-700">
                {s.user_info.name && <span className="font-medium">{s.user_info.name} </span>}
                <span className="text-gray-400">{s.user_info.phone}</span>
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-gray-700 text-sm leading-relaxed">{s.summary}</p>
          </div>
          {Array.isArray(s.appointments) && s.appointments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Appointments</p>
              <div className="space-y-2">
                {s.appointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{appt.date} at {appt.time}</p>
                      <p className="text-xs text-gray-400">ID #{appt.id}</p>
                    </div>
                    <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-md px-2 py-0.5 capitalize">
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Call Metrics</p>
            {s.metrics?.duration_label || s.metrics?.tool_calls_total !== undefined ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {s.metrics.duration_label && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-semibold text-gray-800">{s.metrics.duration_label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Duration</p>
                    </div>
                  )}
                  {s.metrics.tool_calls_total !== undefined && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-semibold text-gray-800">{s.metrics.tool_calls_total}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Actions taken</p>
                    </div>
                  )}
                </div>
                {s.metrics.tool_breakdown && Object.keys(s.metrics.tool_breakdown).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(s.metrics.tool_breakdown).map(([tool, count]) => (
                      <div key={tool} className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span className="capitalize">{tool.replace(/_/g, " ")}</span>
                        <span className="font-medium text-gray-700">×{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">Available on calls made after the latest update</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SummaryHistory({ onClose }: { onClose: () => void }) {
  const [summaries, setSummaries] = useState<StoredSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoredSummary | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/summaries`)
      .then((r) => r.json())
      .then((data) => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h2 className="text-gray-900 font-semibold text-base">Call History</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <p className="text-sm text-gray-400">No call summaries yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {summaries.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {s.user_info?.name ?? s.user_info?.phone ?? "Unknown Caller"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(s.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {s.summary}
                        </p>
                      </div>
                      {Array.isArray(s.appointments) && s.appointments.length > 0 && (
                        <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md px-2 py-0.5 font-medium">
                          {s.appointments.length} appt{s.appointments.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <SummaryCard s={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
