import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import Link from "next/link";

export default function Home() {
  return (
    <div className="hero-gradient pt-10 sm:pt-16 px-3 sm:px-4 pb-3 sm:pb-4">
      {/* White inset card */}
      <div className="mx-auto max-w-4xl rounded-3xl bg-white shadow-sm overflow-hidden">
        <Navbar />
        <Hero />
        <Features />
        <Pricing />
      </div>

      {/* Footer — outside the white card */}
      <footer className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--text-secondary)]">
          <Link href="#features" className="hover:text-[var(--text-primary)]">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-[var(--text-primary)]">
            Pricing
          </Link>
          <a
            href="https://addons.mozilla.org/firefox/addon/getmax/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)]"
          >
            Firefox Add-on
          </a>
          <Link href="/sign-in" className="hover:text-[var(--text-primary)]">
            Login
          </Link>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="font-serif text-lg text-[var(--text-secondary)]"
          >
            Max
          </Link>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Max
          </p>
        </div>
      </footer>
    </div>
  );
}
