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
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] animate-in-delay-2">
        <h3 className="text-sm font-medium text-[var(--text-tertiary)]">Recent activity</h3>
        <div className="mt-4 flex flex-col items-center justify-center py-8">
          <div className="rounded-full bg-[var(--surface-hover)] p-3 mb-2">
            <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-muted)]">No activity yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Your API requests will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] animate-in-delay-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-tertiary)]">Recent activity</h3>
        <span className="text-xs text-[var(--text-muted)]">{logs.length} requests</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--surface-hover)] px-3 py-2 transition hover:bg-[var(--surface-active)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[var(--brand)]"></div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {log.action}
              </span>
              {log.tokensUsed != null && (
                <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-active)] px-2 py-0.5 rounded-[var(--radius-xs)]">
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
