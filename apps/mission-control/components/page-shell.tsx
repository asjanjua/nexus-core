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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-white/70">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

