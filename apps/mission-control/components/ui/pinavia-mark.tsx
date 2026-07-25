/**
 * Pinavia brand mark — the parent-company identity for the product family.
 *
 * Extracted from app/page.tsx so the mark is reusable across the landing
 * page, app chrome, export covers, and any future marketing surface rather
 * than living inline on one screen.
 *
 * Brand-layer rules (nexus-design-system, level 2):
 * - Lime #86BC25 is brand/activation only and never signals status.
 * - Inside app chrome the mark renders monochrome (`tone="mono"`), so the
 *   brand never competes with operating status colour.
 * - The geometry mirrors the Figma brand board: governance ring, P stem,
 *   P bowl/room, and lime signal node. Do not add decorative violet; violet
 *   stays reserved for AI provenance.
 */

type MarkTone = "brand" | "mono";

export function PinaviaMark({
  className = "h-11 w-11",
  tone = "brand",
  title,
}: {
  className?: string;
  /** "brand" = lime/sky on panel. "mono" = neutral, for app chrome. */
  tone?: MarkTone;
  /** Supply to make the mark meaningful to screen readers; omit for decorative use. */
  title?: string;
}) {
  const ring = tone === "brand" ? "#64D8C4" : "#A8B3C7";
  const glyph = "#F7FAFF";
  const signal = tone === "brand" ? "#86BC25" : "#F7FAFF";

  return (
    <svg
      viewBox="0 0 96 96"
      className={`shrink-0 ${className}`}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="48" cy="48" r="45" stroke={ring} strokeWidth="6" />
      <rect x="31.2" y="26.4" width="10.8" height="43.2" rx="5.4" fill={glyph} />
      <circle cx="52.8" cy="40.8" r="9" stroke={glyph} strokeWidth="10.8" />
      <circle cx="75.6" cy="10.8" r="7.2" fill={signal} />
    </svg>
  );
}

/** Horizontal lockup: mark + wordmark + optional descriptor line. */
export function PinaviaLockup({
  descriptor = "Governed AI for high-stakes teams",
  tone = "brand",
}: {
  descriptor?: string;
  tone?: MarkTone;
}) {
  return (
    <div className="flex items-center gap-3">
      <PinaviaMark tone={tone} title="Pinavia" />
      <div>
        <p className="text-2xl font-semibold leading-tight text-white">Pinavia</p>
        {descriptor ? (
          <p className="text-xs uppercase tracking-wide text-white/40">{descriptor}</p>
        ) : null}
      </div>
    </div>
  );
}
