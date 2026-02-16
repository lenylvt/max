"use client";

import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { PricingModal } from "@/components/dashboard/PricingModal";

function DashboardSkeleton() {
  return (
    <div className="hero-gradient pt-10 sm:pt-16 px-3 sm:px-4 pb-3 sm:pb-4">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white shadow-sm overflow-hidden">
        <nav className="flex h-14 items-center justify-between px-8 border-b border-[var(--border)]">
          <div className="h-4 w-12 rounded bg-[var(--skeleton)]" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-[var(--skeleton)]" />
          </div>
        </nav>
        <main className="px-8 py-10">
          <div className="h-6 w-28 rounded bg-[var(--skeleton)] mb-8" />
          <div className="grid gap-6">
            <div className="h-36 w-full rounded-2xl bg-[var(--skeleton)]" />
            <div className="h-52 w-full rounded-2xl bg-[var(--skeleton)]" />
            <div className="h-40 w-full rounded-2xl bg-[var(--skeleton)]" />
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardError() {
  return (
    <div className="hero-gradient pt-10 sm:pt-16 px-3 sm:px-4 pb-3 sm:pb-4">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-20 animate-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-[var(--text-secondary)] text-center">
            No account found. Use the extension to sign in first.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const usage = useQuery(api.usage.getMyUsage);
  const logs = useQuery(api.requestLogs.getRecentLogs);
  const [pricingOpen, setPricingOpen] = useState(false);

  if (user === undefined || usage === undefined || logs === undefined) {
    return <DashboardSkeleton />;
  }

  if (!user || !usage) {
    return <DashboardError />;
  }

  return (
    <div className="hero-gradient pt-10 sm:pt-16 px-3 sm:px-4 pb-3 sm:pb-4">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white shadow-sm overflow-hidden">
        {/* Nav */}
        <nav className="flex h-14 items-center justify-between px-8 border-b border-[var(--border)]">
          <Link
            href="/"
            className="font-serif text-lg text-[var(--text-primary)]"
            style={{ fontStyle: "italic" }}
          >
            Max
          </Link>
          <div className="flex items-center gap-5">
            <UserButton />
          </div>
        </nav>

        {/* Content */}
        <main className="px-8 py-10">
          <h1
            className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl"
            style={{ fontStyle: "italic" }}
          >
            Dashboard
          </h1>

          <div className="mt-8 grid gap-6">
            <PlanCard
              plan={user.plan}
              email={user.email}
              onUpgrade={() => setPricingOpen(true)}
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

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
