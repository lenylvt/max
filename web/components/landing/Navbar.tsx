"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full">
      <div className="flex h-14 items-center justify-between px-6 lg:px-8">
        {/* Left links — flush left */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Pricing
          </Link>
        </div>

        {/* Center logo */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl text-[var(--text-primary)]">
          Max
        </Link>

        {/* Right — flush right */}
        <div className="hidden items-center gap-4 md:flex">
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-full border border-gray-200 px-5 py-1.5 text-sm text-[var(--text-primary)] hover:bg-gray-50"
            >
              Login
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center md:hidden ml-auto"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-[var(--text-secondary)]">Features</Link>
            <Link href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm text-[var(--text-secondary)]">Pricing</Link>
            <SignedOut>
              <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="text-sm text-[var(--text-secondary)]">Login</Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm text-[var(--text-secondary)]">Dashboard</Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
