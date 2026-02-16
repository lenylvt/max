"use client";

interface PlanCardProps {
  plan: "free" | "pro";
  email: string;
  onUpgrade: () => void;
}

export function PlanCard({ plan, email, onUpgrade }: PlanCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Current plan</p>
          <div className="mt-1 flex items-center gap-2.5">
            <p className="text-2xl font-semibold capitalize text-[var(--text-primary)]">
              {plan}
            </p>
            {plan === "pro" && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                Active
              </span>
            )}
          </div>
        </div>
        {plan === "free" ? (
          <button
            onClick={onUpgrade}
            className="rounded-full bg-[var(--text-primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Upgrade to Pro
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50"
          >
            Manage subscription
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-[var(--text-muted)]">
          Signed in as{" "}
          <span className="font-medium text-[var(--text-secondary)]">
            {email}
          </span>
        </p>
      </div>
    </div>
  );
}
