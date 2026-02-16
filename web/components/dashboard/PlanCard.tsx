"use client";

import Link from "next/link";

interface PlanCardProps {
  plan: "free" | "pro";
  email: string;
}

export function PlanCard({ plan, email }: PlanCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-tertiary)]">Current plan</h3>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold capitalize text-[var(--text-primary)]">
              {plan}
            </p>
            {plan === "pro" && (
              <span className="rounded-[var(--radius-full)] bg-[var(--brand-light)] px-2 py-0.5 text-xs font-medium text-[var(--brand)]">
                Active
              </span>
            )}
          </div>
        </div>
        {plan === "free" ? (
          <Link
            href="/pricing"
            className="rounded-[var(--radius-sm)] bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)] active:scale-[0.98]"
          >
            Upgrade to Pro
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="rounded-[var(--radius-sm)] bg-[var(--brand-light)] px-3 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:opacity-80 active:scale-[0.98]"
          >
            Manage subscription
          </Link>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--border-light)] pt-4">
        <p className="text-sm text-[var(--text-tertiary)]">
          Signed in as{" "}
          <span className="font-medium text-[var(--text-secondary)]">{email}</span>
        </p>
      </div>
    </div>
  );
}
