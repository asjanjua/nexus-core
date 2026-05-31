import Link from "next/link";

type Section = {
  title: string;
  body: string;
};

export function LegalPage({
  title,
  eyebrow,
  summary,
  sections,
}: {
  title: string;
  eyebrow: string;
  summary: string;
  sections: Section[];
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        Back to NexusAI
      </Link>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-nexus-accent">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-4 text-base leading-7 text-white/65">{summary}</p>
        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-5">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-white/65">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
