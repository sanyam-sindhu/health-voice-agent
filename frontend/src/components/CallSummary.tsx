import React from "react";

export interface CallMetrics {
  duration_seconds?: number;
  duration_label?: string;
  tool_calls_total?: number;
  tool_breakdown?: Record<string, number>;
}

export interface SummaryData {
  session_id: string;
  summary: string;
  appointments: Array<{ id: number; date: string; time: string; status: string }>;
  user: { id: number | null; name: string | null; phone: string | null };
  metrics?: CallMetrics;
  timestamp: string;
}

export default function CallSummary({ data, onDismiss }: { data: SummaryData; onDismiss: () => void }) {
  const time = new Date(data.timestamp).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 font-semibold text-base">Call Summary</h2>
            <p className="text-gray-400 text-xs mt-0.5">{time}</p>
          </div>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {data.user?.phone && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400 w-14 flex-shrink-0 text-xs pt-0.5">Caller</span>
              <span className="text-gray-700">
                {data.user.name && <span className="font-medium">{data.user.name} </span>}
                <span className="text-gray-400">{data.user.phone}</span>
              </span>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-gray-700 text-sm leading-relaxed">{data.summary}</p>
          </div>

          {data.appointments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Appointments</p>
              <div className="space-y-2">
                {data.appointments.map((appt) => (
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

          {data.metrics && (data.metrics.duration_label || data.metrics.tool_calls_total !== undefined) && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Call Metrics</p>
              <div className="grid grid-cols-2 gap-2">
                {data.metrics.duration_label && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-base font-semibold text-gray-800">{data.metrics.duration_label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Duration</p>
                  </div>
                )}
                {data.metrics.tool_calls_total !== undefined && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-base font-semibold text-gray-800">{data.metrics.tool_calls_total}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Actions taken</p>
                  </div>
                )}
              </div>
              {data.metrics.tool_breakdown && Object.keys(data.metrics.tool_breakdown).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(data.metrics.tool_breakdown).map(([tool, count]) => (
                    <div key={tool} className="flex items-center justify-between text-xs text-gray-500 px-1">
                      <span className="capitalize">{tool.replace(/_/g, " ")}</span>
                      <span className="font-medium text-gray-700">×{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
