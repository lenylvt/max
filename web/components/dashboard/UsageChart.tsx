"use client";

import { useState } from "react";

interface UsageChartProps {
  today: number;
  limit: number;
  history: { date: string; count: number }[];
}

export function UsageChart({ today, limit, history }: UsageChartProps) {
  const pct = limit > 0 ? Math.min((today / limit) * 100, 100) : 0;
  const maxCount = Math.max(...history.map((h) => h.count), limit);
  const remaining = Math.max(0, limit - today);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] animate-in-delay-1">
      <h3 className="text-sm font-medium text-[var(--text-tertiary)]">Usage today</h3>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold text-[var(--text-primary)]">{today}</span>
        <span className="mb-1 text-sm text-[var(--text-tertiary)]">/ {limit} requests</span>
      </div>
      {remaining > 0 && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{remaining} requests remaining</p>
      )}
      {remaining === 0 && (
        <p className="mt-1 text-xs font-medium text-[var(--error)]">Daily limit reached</p>
      )}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-hover)]">
        <div
          className="h-full rounded-[var(--radius-full)] transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: pct >= 90 ? "var(--error)" : pct >= 70 ? "var(--warning)" : "var(--brand)",
          }}
        />
      </div>

      <h4 className="mt-6 text-sm font-medium text-[var(--text-tertiary)]">Last 7 days</h4>
      <div className="mt-3 flex items-end gap-1.5">
        {history.map((day, idx) => {
          const height =
            maxCount > 0 ? Math.max((day.count / maxCount) * 80, 4) : 4;
          const label = day.date.slice(5); // "MM-DD"
          const isToday = idx === history.length - 1;
          const isHovered = hoveredDay === idx;
          return (
            <div
              key={day.date}
              className="relative flex flex-1 flex-col items-center gap-1 group"
              onMouseEnter={() => setHoveredDay(idx)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--text-primary)] px-2 py-1 text-[10px] font-medium text-[var(--surface)] whitespace-nowrap shadow-[var(--shadow-sm)] animate-in z-10">
                  {day.date}: {day.count} req
                </div>
              )}
              <span className={`text-[10px] transition ${isToday ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)]"}`}>
                {day.count}
              </span>
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${height}px`,
                  background: isToday ? "var(--brand)" : "var(--brand-light)",
                }}
              />
              <span className={`text-[10px] ${isToday ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)]"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
