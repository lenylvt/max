import Link from "next/link";

export function Hero() {
  return (
    <section className="px-6 pt-24 pb-16 text-center">
      <div className="mx-auto max-w-3xl animate-in">
        <div className="mb-6 inline-block rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--brand-light)] px-4 py-1.5 text-sm font-medium text-[var(--brand-text)]">
          Free &mdash; 10 AI requests/day
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-[var(--text-primary)] sm:text-6xl">
          AI-powered browsing
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--text-secondary)]">
          Get instant summaries, translations, and answers while you browse.
          Hover any link for an AI preview. No API key needed.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="https://addons.mozilla.org/firefox/addon/getmax/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--surface)] shadow-[var(--shadow-sm)] transition hover:opacity-90"
          >
            Install for Firefox
          </a>
          <Link
            href="/sign-up"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
