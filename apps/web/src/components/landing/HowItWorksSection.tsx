const steps = [
  {
    number: 1,
    title: "Create Projects",
    description:
      "Organize your secrets by project or environment. Keep development, staging, and production separate.",
  },
  {
    number: 2,
    title: "Store Secrets Securely",
    description:
      "Add API keys, tokens, and credentials. Everything is encrypted at rest and in transit using AES-256.",
  },
  {
    number: 3,
    title: "Access Anywhere",
    description:
      "Retrieve secrets via CLI, API, or web interface. Integrate seamlessly with your existing workflow.",
  },
];

/**
 * Numbered-step walkthrough explaining the core product workflow.
 */
export function HowItWorksSection() {
  return (
    <section className="container mx-auto px-6 py-20 bg-slate-800/30 rounded-2xl my-12">
      <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
      <div className="max-w-3xl mx-auto space-y-8">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
              {step.number}
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
              <p className="text-slate-300">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
