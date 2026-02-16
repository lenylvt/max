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

  const barColor =
    pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-[var(--text-primary)]";

  return (
    <div className="rounded-2xl border border-[var(--border)] p-6 animate-in-delay-1">
      <p className="text-sm text-[var(--text-muted)]">Usage today</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-semibold text-[var(--text-primary)]">{today}</span>
        <span className="mb-0.5 text-sm text-[var(--text-muted)]">/ {limit} requests</span>
      </div>
      {remaining > 0 && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{remaining} remaining</p>
      )}
      {remaining === 0 && (
        <p className="mt-1 text-xs font-medium text-red-500">Daily limit reached</p>
      )}

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--skeleton)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 7-day chart */}
      <p className="mt-8 text-sm text-[var(--text-muted)]">Last 7 days</p>
      <div className="mt-3 flex items-end gap-1.5">
        {history.map((day, idx) => {
          const height =
            maxCount > 0 ? Math.max((day.count / maxCount) * 80, 4) : 4;
          const label = day.date.slice(5);
          const isToday = idx === history.length - 1;
          const isHovered = hoveredDay === idx;
          return (
            <div
              key={day.date}
              className="relative flex flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setHoveredDay(idx)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {isHovered && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--text-primary)] px-2.5 py-1 text-[10px] font-medium text-white whitespace-nowrap shadow-lg z-10 animate-in">
                  {day.date}: {day.count} req
                </div>
              )}
              <span className={`text-[10px] transition ${isToday ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)]"}`}>
                {day.count}
              </span>
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${height}px`,
                  background: isToday ? "var(--text-primary)" : "var(--border)",
                }}
              />
              <span className={`text-[10px] ${isToday ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)]"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
