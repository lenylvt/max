"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[var(--border-light)] bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-[var(--text-primary)]">
          <img src="/star.svg" alt="" width={20} height={20} />
          Max
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="#pricing"
            className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Pricing
          </Link>
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-4 py-1.5 text-sm font-medium text-[var(--surface)] transition hover:opacity-90"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition hover:bg-[var(--surface-hover)] sm:hidden"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="4" y1="4" x2="14" y2="14" />
                <line x1="14" y1="4" x2="4" y2="14" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="15" y2="5" />
                <line x1="3" y1="9" x2="15" y2="9" />
                <line x1="3" y1="13" x2="15" y2="13" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[var(--border-light)] bg-[var(--surface)] px-6 py-4 sm:hidden animate-in">
          <div className="flex flex-col gap-3">
            <Link
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Pricing
            </Link>
            <SignedOut>
              <Link
                href="/sign-in"
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMenuOpen(false)}
                className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-4 py-2 text-center text-sm font-medium text-[var(--surface)] transition hover:opacity-90"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
