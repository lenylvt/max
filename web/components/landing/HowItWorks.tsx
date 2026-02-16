const steps = [
  {
    number: "1",
    title: "Install the extension",
    description: "Add Max to Firefox in one click. No account required to start.",
  },
  {
    number: "2",
    title: "Browse normally",
    description:
      "Max works in the background. Hover any link to see an AI-generated preview.",
  },
  {
    number: "3",
    title: "Ask anything",
    description:
      "Summarize pages, translate text, or ask questions about any content you see.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          How it works
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className={`text-center animate-in-delay-${i + 1}`}>
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-light)] text-sm font-bold text-[var(--brand)]">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
