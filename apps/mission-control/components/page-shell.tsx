import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:px-5">
        <p className="text-xs uppercase text-nexus-accent/75">Nexus Mission Control</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
