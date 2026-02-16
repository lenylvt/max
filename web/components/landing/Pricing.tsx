"use client";

import { PricingTable } from "@clerk/nextjs";

export function Pricing() {
  return (
    <section id="pricing" className="px-6 pt-20 pb-10 lg:pt-28 lg:pb-14">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl text-[var(--text-primary)] sm:text-5xl" style={{ fontStyle: "italic" }}>
            Simple pricing.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[var(--text-secondary)]">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div>
          <PricingTable
            appearance={{
              variables: {
                colorPrimary: "#1a1a1a",
                colorBackground: "#ffffff",
                colorForeground: "#1a1a1a",
                colorMutedForeground: "#9ca3af",
                colorMuted: "#f5f5f5",
                colorBorder: "#e2e5eb",
                borderRadius: "14px",
                fontSize: "0.875rem",
              },
              elements: {
                formButtonPrimary: {
                  backgroundColor: "#1a1a1a",
                  "&:hover": { backgroundColor: "#404040" },
                },
              },
            }}
            checkoutProps={{
              appearance: {
                variables: {
                  colorPrimary: "#1a1a1a",
                  colorBackground: "#ffffff",
                  colorForeground: "#1a1a1a",
                  colorBorder: "#e2e5eb",
                  borderRadius: "14px",
                },
              },
            }}
            newSubscriptionRedirectUrl="/dashboard"
            fallback={
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="h-96 w-full rounded-[14px] bg-white" />
                <div className="h-96 w-full rounded-[14px] bg-white" />
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}
