export function Hero() {
  return (
    <section className="relative px-6 flex items-center justify-center min-h-[calc(100svh-12rem)]">
      <div className="mx-auto max-w-3xl text-center">
        <h1
          className="font-serif text-6xl tracking-tight text-[var(--text-primary)] sm:text-7xl lg:text-8xl animate-in"
          style={{ fontStyle: "italic" }}
        >
          AI superpowers for
          <br />
          your browser.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-secondary)] sm:text-lg animate-in-delay-1">
          Summarize pages, preview links, translate, search & ask
          <br />— all without leaving the tab.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3 animate-in-delay-2">
          <a
            href="https://addons.mozilla.org/firefox/addon/getmax/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-7 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Install for Firefox
          </a>
        </div>

        <p className="mt-4 text-sm text-[var(--text-muted)] animate-in-delay-3">
          Free to use &middot; No API key needed
        </p>
      </div>
    </section>
  );
}
