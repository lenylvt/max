"use client";

import { PricingTable } from "@clerk/nextjs";

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Simple pricing
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-[var(--text-secondary)]">
          Start free. Upgrade when you need more.
        </p>
        <div className="mt-12">
          <PricingTable
            appearance={{
              variables: {
                colorPrimary: "#6366f1",
                colorBackground: "#ffffff",
                colorForeground: "#37352f",
                colorMutedForeground: "#6b6b68",
                colorMuted: "#f7f6f3",
                colorBorder: "#e8e8e4",
                borderRadius: "8px",
                fontSize: "0.875rem",
              },
              elements: {
                formButtonPrimary: {
                  backgroundColor: "#6366f1",
                  "&:hover": { backgroundColor: "#4f46e5" },
                },
              },
            }}
            checkoutProps={{
              appearance: {
                variables: {
                  colorPrimary: "#6366f1",
                  colorBackground: "#ffffff",
                  colorForeground: "#37352f",
                  colorBorder: "#e8e8e4",
                  borderRadius: "8px",
                },
              },
            }}
            newSubscriptionRedirectUrl="/dashboard"
            fallback={
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="skeleton h-72 w-full" />
                <div className="skeleton h-72 w-full" />
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}
