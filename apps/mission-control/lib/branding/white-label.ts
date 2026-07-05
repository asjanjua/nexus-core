/**
 * Level-3 white-label brand resolution (Nucleus client deployments).
 *
 * Deliberately narrow, per Design Philosophy v1.5 §4.1 and
 * Pinavia_Brand_and_Domain_Architecture.md §4: this layer swaps ONLY logo,
 * brand accent colour, and font family. It never touches core status
 * colours (nexus.accent/warn/danger/ai/sky) or spacing/type-ramp tokens —
 * those are the trust mechanics and are contractually fixed regardless of
 * which product or client brand is applied.
 *
 * Not yet wired into a layout/root component — see task "Build
 * Quorum-branded board UI screen" and any future Nucleus screen work for
 * the actual call site. This module is the resolver + injector primitive.
 */

import type { WorkspaceSettings } from "@/lib/contracts";

export const PINAVIA_DEFAULT_BRAND = {
  logoUrl: null as string | null,
  accentColor: "#86bc25",
  fontFamily: "'Inter', system-ui, sans-serif",
};

export type ResolvedBrand = typeof PINAVIA_DEFAULT_BRAND;

const SAFE_FONT_FAMILY_RE = /^[A-Za-z0-9\s"',.-]+$/;

function safeFontFamily(fontFamily: string | null | undefined): string | null {
  if (!fontFamily) return null;
  return SAFE_FONT_FAMILY_RE.test(fontFamily) ? fontFamily : null;
}

/**
 * Resolves the effective brand for a workspace: the workspace's
 * whiteLabelBrand override merged over the Pinavia defaults, field by field
 * (a partial override — e.g. logo only — falls back to defaults for the
 * rest, it does not require every field to be set).
 */
export function resolveBrand(settings: Pick<WorkspaceSettings, "whiteLabelBrand">): ResolvedBrand {
  const override = settings.whiteLabelBrand;
  if (!override) return PINAVIA_DEFAULT_BRAND;
  return {
    logoUrl: override.logoUrl ?? PINAVIA_DEFAULT_BRAND.logoUrl,
    accentColor: override.accentColor ?? PINAVIA_DEFAULT_BRAND.accentColor,
    fontFamily: safeFontFamily(override.fontFamily) ?? PINAVIA_DEFAULT_BRAND.fontFamily,
  };
}

/**
 * Renders the CSS custom property overrides for a resolved brand as a plain
 * string, suitable for a <style> tag. Returns "" when the brand is exactly
 * the Pinavia default (nothing to override), so the common case costs
 * nothing at render time.
 */
export function brandStyleTag(brand: ResolvedBrand): string {
  const fontFamily = safeFontFamily(brand.fontFamily) ?? PINAVIA_DEFAULT_BRAND.fontFamily;
  if (
    brand.accentColor === PINAVIA_DEFAULT_BRAND.accentColor &&
    fontFamily === PINAVIA_DEFAULT_BRAND.fontFamily
  ) {
    return "";
  }
  return `:root { --nexus-brand-accent: ${brand.accentColor}; --nexus-brand-font: ${fontFamily}; }`;
}
