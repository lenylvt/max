"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";

export default function ExtensionAuthPage() {
  const { isSignedIn, isLoaded } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const hasRun = useRef(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const result = await getOrCreateUser();
        // Use postMessage so the extension's content script can capture the token
        // without exposing it in the URL hash or browser history
        window.postMessage(
          {
            type: "MAX_AUTH_TOKEN",
            token: result.apiToken,
            email: result.email,
          },
          window.location.origin
        );
        // Also set a data attribute as fallback for the extension's tabs.onUpdated listener
        document.documentElement.dataset.maxToken = result.apiToken;
        document.documentElement.dataset.maxEmail = result.email;
        setStatus("success");
      } catch (err) {
        console.error("Failed to get/create user:", err);
        setStatus("error");
      }
    })();
  }, [isLoaded, isSignedIn, getOrCreateUser]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--text-primary)]" />
          Loading...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <img src="/star.svg" alt="" width={32} height={32} className="mx-auto mb-4" />
          <h2 className="mb-4 text-lg font-medium text-[var(--text-primary)]">
            Sign in to connect Max Cloud
          </h2>
          <SignIn routing="hash" forceRedirectUrl="/extension-auth" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Connection failed
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Please close this tab and try again from the extension.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center animate-in">
        <img src="/star.svg" alt="" width={40} height={40} className="mx-auto mb-3" />
        <h2 className="text-lg font-medium text-[var(--text-primary)]">
          Connected to Max Cloud
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This tab will close automatically...
        </p>
      </div>
    </div>
  );
}
