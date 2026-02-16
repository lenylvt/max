"use client";

interface LogEntry {
  timestamp: number;
  action: string;
  tokensUsed?: number;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ActivityLog({ logs }: ActivityLogProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-6 animate-in-delay-2">
        <p className="text-sm text-[var(--text-muted)]">Recent activity</p>
        <div className="mt-6 flex flex-col items-center justify-center py-10">
          <div className="rounded-full bg-[var(--skeleton)] p-3 mb-3">
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-muted)]">No activity yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Your requests will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] p-6 animate-in-delay-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-muted)]">Recent activity</p>
        <span className="text-xs text-[var(--text-muted)]">{logs.length} requests</span>
      </div>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-[var(--skeleton)] px-4 py-2.5 transition hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {log.action}
              </span>
              {log.tokensUsed != null && (
                <span className="text-[11px] text-[var(--text-muted)] bg-white px-2 py-0.5 rounded-md">
                  {log.tokensUsed.toLocaleString()} tokens
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)]" title={new Date(log.timestamp).toLocaleString()}>
              {formatRelativeTime(log.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
