import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <footer className="border-t border-[var(--border-light)] bg-[var(--background)] px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
            <img src="/star.svg" alt="" width={14} height={14} />
            Max
          </span>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-secondary)]">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-secondary)]">
              Sign in
            </Link>
            <a
              href="https://addons.mozilla.org/firefox/addon/getmax/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-secondary)]"
            >
              Firefox Add-on
            </a>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            AI-powered browsing
          </p>
        </div>
      </footer>
    </div>
  );
}
