"use client";

import { PricingTable } from "@clerk/nextjs";
import { useEffect } from "react";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

export function PricingModal({ open, onClose }: PricingModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click to close, no overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[var(--text-muted)] hover:bg-gray-200 hover:text-[var(--text-primary)] transition"
          aria-label="Close"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>

        <div className="px-6 pt-10 pb-8 sm:px-10">
          <div className="text-center mb-8">
            <h2
              className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl"
              style={{ fontStyle: "italic" }}
            >
              Simple pricing.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--text-secondary)]">
              Start free. Upgrade when you need more.
            </p>
          </div>

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
                <div className="h-80 w-full rounded-[14px] bg-[var(--skeleton)]" />
                <div className="h-80 w-full rounded-[14px] bg-[var(--skeleton)]" />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
