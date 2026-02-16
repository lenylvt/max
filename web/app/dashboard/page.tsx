"use client";

import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { ActivityLog } from "@/components/dashboard/ActivityLog";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="skeleton h-5 w-12" />
          <div className="flex items-center gap-4">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-8 w-8 rounded-full" />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="skeleton h-7 w-32 mb-6" />
        <div className="grid gap-6">
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-56 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </main>
    </div>
  );
}

function DashboardError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center animate-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--error-light)" }}>
          <svg className="h-6 w-6" style={{ color: "var(--error)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-[var(--text-secondary)]">
          No account found. Use the extension to sign in first.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-[var(--brand)] transition hover:text-[var(--brand-hover)]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const usage = useQuery(api.usage.getMyUsage);
  const logs = useQuery(api.requestLogs.getRecentLogs);

  if (user === undefined || usage === undefined || logs === undefined) {
    return <DashboardSkeleton />;
  }

  if (!user || !usage) {
    return <DashboardError />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-[var(--text-primary)]">
            <img src="/star.svg" alt="" width={20} height={20} />
            Max
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-secondary)]"
            >
              Pricing
            </Link>
            <span className="text-sm text-[var(--text-tertiary)]">Dashboard</span>
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="mt-6 grid gap-6">
          <PlanCard
            plan={user.plan}
            email={user.email}
          />
          <UsageChart
            today={usage.today}
            limit={usage.limit}
            history={usage.history}
          />
          <ActivityLog logs={logs ?? []} />
        </div>
      </main>
    </div>
  );
}
