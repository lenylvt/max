export function Features() {
  return (
    <section id="features" className="px-8 sm:px-12 lg:px-16 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl text-[var(--text-primary)] sm:text-5xl" style={{ fontStyle: "italic" }}>
            Everything you need,
            <br />
            nothing you don&apos;t.
          </h2>
          <p className="mt-4 text-base text-[var(--text-secondary)] max-w-lg mx-auto">
            Five powerful features that work right inside your browser — no setup, no clutter.
          </p>
        </div>

        <div className="space-y-20 lg:space-y-24">
          {/* Feature 1: Link Preview */}
          <FeatureBlock
            title="Link preview"
            description="Hover over any link on Google, Bing, or DuckDuckGo to see what's on the other side. OG image, title, description — all in a floating card. No click needed."
            mockup={<PreviewMockup />}
          />

          {/* Feature 2: Page Summary */}
          <FeatureBlock
            title="Page summary"
            description="One shortcut to get a structured summary of any page. Hero image, key points, sections with icons — all in a beautiful overlay card."
            mockup={<SummaryMockup />}
            reverse
          />

          {/* Feature 3: Search & Ask AI */}
          <FeatureBlock
            title="Search & ask AI"
            description="A floating search bar that finds text on the page — or asks AI about it. Type a question and get an instant answer grounded in the page content."
            mockup={<SearchMockup />}
          />

          {/* Feature 4: Translate */}
          <FeatureBlock
            title="Translate page"
            description="Translate all visible text on any page in-place. Batched for speed, with a one-click revert. Keeps the original layout intact."
            mockup={<TranslateMockup />}
            reverse
          />

          {/* Feature 5: Ask about selection */}
          <FeatureBlock
            title="Ask about selection"
            description="Select any text and a floating input appears. Ask questions, get explanations, translations — all contextual to what you highlighted."
            mockup={<AskSelectionMockup />}
          />
        </div>

      </div>
    </section>
  );
}

/* ── Layout ────────────────────────────────────────────────────────────── */

function FeatureBlock({ title, description, mockup, reverse = false }: {
  title: string; description: string; mockup: React.ReactNode; reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-10 lg:gap-16 lg:items-start ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      <div className="lg:w-2/5 shrink-0 lg:pt-8">
        <h3 className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl" style={{ fontStyle: "italic" }}>
          {title}
        </h3>
        <p className="mt-4 text-base text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
      <div className="lg:w-3/5">{mockup}</div>
    </div>
  );
}


/* ── Browser Frame ─────────────────────────────────────────────────────── */

function BrowserFrame({ children, url }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="mockup-browser">
      <div className="mockup-browser-bar">
        <div className="mockup-browser-dot" />
        <div className="mockup-browser-dot" />
        <div className="mockup-browser-dot" />
        {url && (
          <div className="ml-3 flex-1 rounded-md bg-[var(--skeleton)] px-3 py-1 text-xs text-[var(--text-muted)] truncate">
            {url}
          </div>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Feature 1: Link Preview Mockup ────────────────────────────────────── */

function PreviewMockup() {
  return (
    <BrowserFrame url="google.com/search?q=rust+programming">
      <div className="space-y-3">
        {/* Fake search result */}
        <div>
          <div className="text-[10px] text-[var(--text-muted)] mb-0.5">blog.rust-lang.org</div>
          <div className="text-sm text-blue-600 cursor-default">Rust Programming Language - Official Blog</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">The official blog of the Rust programming language...</div>
        </div>

        {/* Hovered result with preview card */}
        <div>
          <div className="text-[10px] text-[var(--text-muted)] mb-0.5">blog.logrocket.com</div>
          <div className="text-sm text-blue-600 underline decoration-blue-200 cursor-default">
            Why Rust is the future of systems programming
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">An in-depth analysis of memory safety...</div>

          {/* The preview card - inline flow instead of absolute */}
          <div className="mt-3 w-64 rounded-xl bg-white border border-[rgba(0,0,0,0.06)] shadow-lg overflow-hidden">
            <div className="h-16 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
              <span className="text-lg font-bold text-orange-300">Rust</span>
            </div>
            <div className="p-3">
              <div className="text-xs font-semibold text-[var(--text-primary)] leading-snug mb-1">Why Rust is the future of systems programming</div>
              <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-1.5">An in-depth look at memory safety and performance...</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                <span className="text-[10px] text-[var(--text-muted)]">blog.logrocket.com</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--text-muted)] mb-0.5">doc.rust-lang.org</div>
          <div className="text-sm text-blue-600 cursor-default">The Rust Programming Language - Book</div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ── Feature 2: Summary Mockup ─────────────────────────────────────────── */

function SummaryMockup() {
  return (
    <BrowserFrame url="arxiv.org/abs/2401.12345">
      {/* Skeleton page behind */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-48 rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-full rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-5/6 rounded bg-[var(--skeleton)]" />
      </div>

      {/* Summary overlay card */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 max-w-sm">
        {/* Source */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded bg-gray-200" />
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-wide">arxiv.org</span>
        </div>

        {/* Title */}
        <h4 className="text-base font-bold text-[var(--text-primary)] leading-snug mb-0.5">Efficient Transformer Architectures for Long Sequences</h4>
        <p className="text-[11px] text-[#8a857e] mb-2">Chen et al. &middot; 2024</p>

        {/* Summary */}
        <p className="text-[13px] text-[#3d3832] leading-relaxed mb-3">This paper introduces a novel sparse attention mechanism that reduces compute cost by 40% while maintaining competitive performance across 12 benchmark tasks.</p>

        <div className="h-px bg-[#e8e8e4] mb-3" />

        {/* Sections grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="#6b6b68"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
              <span className="text-[9px] font-bold text-[#6b6b68] uppercase tracking-wider">Key findings</span>
            </div>
            <ul className="space-y-0.5">
              <li className="text-[11px] text-[#3d3832] pl-2.5 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1 before:h-1 before:rounded-full before:bg-[#c4c4c0]">40% compute reduction</li>
              <li className="text-[11px] text-[#3d3832] pl-2.5 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1 before:h-1 before:rounded-full before:bg-[#c4c4c0]">Sparse attention patterns</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="#6b6b68"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              <span className="text-[9px] font-bold text-[#6b6b68] uppercase tracking-wider">Details</span>
            </div>
            <p className="text-[11px] text-[#3d3832]">Benchmarked on GPT-4 and Claude across NLU tasks</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ── Feature 3: Search & Ask AI Mockup ─────────────────────────────────── */

function SearchMockup() {
  return (
    <BrowserFrame url="docs.python.org/3/library/asyncio.html">
      {/* Page content */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-44 rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-full rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-5/6 rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-3/4 rounded bg-[var(--skeleton)]" />
      </div>

      {/* Search bar - mimics .ailens-search-bar fixed top-right */}
      <div className="flex flex-col items-end gap-1.5">
        <div className="mockup-pill flex items-center gap-1 px-2.5 py-1 w-64">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              className="flex-1 min-w-0 border-none outline-none bg-transparent text-xs text-[var(--text-primary)] pointer-events-none"
              defaultValue="What is asyncio.run()?"
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <button className="px-2 py-0.5 bg-[#111] text-white text-[10px] font-semibold rounded-md pointer-events-none" tabIndex={-1}>Ask AI</button>
          </div>
        </div>

        {/* AI answer card */}
        <div className="mockup-pill p-3 w-64">
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
            <strong>asyncio.run()</strong> creates a new event loop, runs the given coroutine, then closes the loop. It&apos;s the recommended entry point since Python 3.7 — no need to manually manage the event loop lifecycle.
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ── Feature 4: Translate Mockup ───────────────────────────────────────── */

function TranslateMockup() {
  return (
    <BrowserFrame url="lemonde.fr/international/article/2024/...">
      <div className="space-y-3">
        {/* Original French text, translated in-place */}
        <div>
          <div className="h-4 w-56 rounded bg-[var(--skeleton)] mb-2" />
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
            The European Union has reached a historic agreement on the regulation of artificial intelligence, marking a turning point in the global governance of emerging technologies.
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
            This legislation, the first of its kind in the world, establishes a risk-based framework that classifies AI systems according to their potential impact on fundamental rights.
          </p>
        </div>
        <div className="h-2.5 w-4/5 rounded bg-[var(--skeleton)]" />
        <div className="h-2.5 w-3/5 rounded bg-[var(--skeleton)]" />
      </div>

      {/* Toast indicator at bottom - mimics .ailens-translate-indicator */}
      <div className="flex justify-center mt-6">
        <div className="mockup-toast">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="#16a34a"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          <span className="text-[#86efac]">Translated to English</span>
          <button className="px-2.5 py-1 text-[11px] rounded-md border border-white/15 bg-white/10 text-[#e0e0e0] pointer-events-none" tabIndex={-1}>Revert</button>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ── Feature 5: Ask Selection Mockup ───────────────────────────────────── */

function AskSelectionMockup() {
  return (
    <BrowserFrame url="en.wikipedia.org/wiki/Quantum_computing">
      <div className="space-y-2 mb-2">
        <div className="h-4 w-52 rounded bg-[var(--skeleton)]" />
      </div>

      {/* Text with highlighted selection */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-1">
        A quantum computer exploits{" "}
        <mark className="bg-blue-500/25 text-inherit rounded-sm px-0.5">
          quantum-mechanical phenomena such as superposition and entanglement to perform operations on data
        </mark>{" "}
        that would be impractical with classical computers.
      </p>

      <div className="h-2.5 w-full rounded bg-[var(--skeleton)] mb-1.5" />
      <div className="h-2.5 w-4/5 rounded bg-[var(--skeleton)] mb-5" />

      {/* Floating ask panel - mimics .ailens-ask-panel with pill input */}
      <div className="max-w-[300px]">
        <div className="mockup-pill flex items-center gap-1.5 pl-4 pr-1.5 py-1.5">
          <input
            type="text"
            className="flex-1 min-w-0 border-none outline-none bg-transparent text-xs text-[var(--text-primary)] pointer-events-none"
            defaultValue="Explain this in simple terms"
            readOnly
            tabIndex={-1}
          />
          <button className="shrink-0 w-7 h-7 bg-[#111] text-white rounded-full flex items-center justify-center pointer-events-none" tabIndex={-1}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
          </button>
        </div>

        {/* Answer card */}
        <div className="mockup-pill mt-2 p-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Quantum computers use two physics tricks: <strong className="text-[var(--text-primary)]">superposition</strong> (a bit can be 0 and 1 simultaneously) and <strong className="text-[var(--text-primary)]">entanglement</strong> (two bits are linked so changing one instantly affects the other). This lets them solve certain problems exponentially faster.
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}
