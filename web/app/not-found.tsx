import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center animate-in">
        <img src="/star.svg" alt="" width={48} height={48} className="mx-auto mb-4 opacity-40" />
        <p className="text-6xl font-bold text-[var(--text-muted)]">404</p>
        <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-5 py-2.5 text-sm font-medium text-[var(--surface)] transition hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
