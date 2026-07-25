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
 *
 * KNOWN DIVERGENCE (2026-07-25): the Figma brand board
 * ("01a Pinavia Brand Assets") carries a different mark — governance ring +
 * geometric P + lime signal node. This component preserves the mark already
 * shipped in code. The two should be reconciled to one before launch; that
 * is a brand decision, not a refactor, so it is deliberately not made here.
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
  const glyph = tone === "brand" ? "#86BC25" : "#F7FAFF";
  const rule = tone === "brand" ? "#8FC5FF" : "#A8B3C7";

  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <rect x="6" y="6" width="52" height="52" rx="14" fill="#101826" />
      <rect x="6.5" y="6.5" width="51" height="51" rx="13.5" stroke="white" strokeOpacity="0.16" />
      <path
        d="M20 47V17h17.5c8.1 0 13.5 4.9 13.5 12.4 0 7.3-5.4 12.3-13.5 12.3H29v5.3h-9Zm9-13h7.7c3.5 0 5.7-1.8 5.7-4.6 0-2.9-2.2-4.7-5.7-4.7H29V34Z"
        fill={glyph}
      />
      <path d="M18 50h28" stroke={rule} strokeWidth="2.5" strokeLinecap="round" />
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
