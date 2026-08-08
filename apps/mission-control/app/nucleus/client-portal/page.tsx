import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { repository } from "@/lib/data/repository";
import { PROTECTED_TRUST_ELEMENTS, PROTECTED_TRUST_ELEMENT_LABELS } from "@/lib/forbidden-actions";

export const metadata = { title: "Client Portal Preview | Nucleus" };

/**
 * Nucleus Assurance arc, screen 1. Primary user: engagement partner.
 *
 * What the client actually sees, rendered with the firm's real brand settings
 * rather than described. No new persistence — the brand layer already lives in
 * workspace settings, and the trust layer is the shared constant the release
 * API enforces.
 *
 * THE POINT OF THE SCREEN is the side-by-side. A partner asks "how much of
 * this is mine?", and the honest answer is: everything on the left, and none
 * of the four items on the right. Showing them together, with the firm's own
 * accent applied to the left half, answers it faster than any contract clause.
 */
export default async function NucleusClientPortalPage() {
  const workspaceId = await requireWorkspaceId("/nucleus/client-portal");
  const settings = await repository.getWorkspaceSettings(workspaceId).catch(() => null);
  const brand = settings?.whiteLabelBrand ?? null;

  // Falls back to the Nucleus graphite when the firm has set nothing. Chosen
  // because it is deliberately unbranded — "your brand here" — rather than a
  // Pinavia colour a partner might mistake for a default they are stuck with.
  const accent = brand?.accentColor ?? "#9AA6B8";
  const configured = Boolean(brand?.accentColor || brand?.logoUrl || brand?.fontFamily);

  return (
    <PageShell
      title="Client Portal Preview"
      description="What your client sees. The left column is yours to change; the right column is contractually fixed and enforced when a deliverable is released."
    >
      <div className="space-y-4">
        {!configured && (
          <section className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
            <p className="text-sm font-semibold text-nexus-text">No firm brand set yet</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              This preview is showing the unbranded default. Set your logo, accent and typeface and
              this page updates — nothing on the right-hand side changes.
            </p>
            <Link href="/nucleus/profile" className="btn-primary mt-3 inline-flex" prefetch={false}>
              Set firm brand
            </Link>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel" style={{ borderColor: `${accent}55` }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: accent }}>
              Your brand layer
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                {brand?.logoUrl ? (
                  // Deliberately a plain img: a partner logo is an arbitrary
                  // remote URL, not an asset this app owns or should optimise.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt="Firm logo" className="h-8 w-auto" />
                ) : (
                  <span className="rounded border border-dashed border-white/20 px-3 py-1 text-xs text-nexus-muted">
                    Logo not set
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: accent, fontFamily: brand?.fontFamily ?? undefined }}>
                Sample client heading in your accent and typeface
              </p>
              <div className="rounded-lg p-3" style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}44` }}>
                <p className="text-xs leading-5 text-nexus-muted">
                  Buttons, headings, and the product name your client reads are all yours. None of it
                  changes what they can verify.
                </p>
              </div>
            </div>
          </div>

          <div className="panel border-nexus-warn/30">
            <p className="text-xs uppercase tracking-wide text-nexus-warn">Fixed trust layer</p>
            <p className="mt-1 text-[11px] leading-4 text-nexus-muted">
              Cannot be re-skinned, hidden, or renamed. Requesting removal at release is refused and
              recorded.
            </p>
            <ul className="mt-3 space-y-2">
              {PROTECTED_TRUST_ELEMENTS.map((el) => (
                <li key={el} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-xs font-semibold capitalize text-nexus-text">{el}</p>
                  <p className="mt-1 text-[11px] leading-4 text-nexus-muted">
                    {PROTECTED_TRUST_ELEMENT_LABELS[el]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <p className="panel-title">Why this split is the product</p>
          <p className="mt-2 text-sm leading-6 text-nexus-muted">
            A client of your firm should be able to see where a figure came from, what it does not
            cover, who reviewed it, and that the work is auditable — regardless of whose logo is at
            the top. That is the guarantee your client is buying from you, and the reason the right
            column is enforced in code rather than promised in a contract.
          </p>
          <Link href="/nucleus/publish" className="btn-subtle mt-3 inline-flex text-sm" prefetch={false}>
            See it enforced at release
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
