import Link from "next/link";
import { PinaviaLockup } from "@/components/ui/pinavia-mark";

/**
 * Public site footer.
 *
 * Extracted from app/page.tsx because it rendered ONLY on the landing page and
 * the product brief. Anyone arriving from search on /pricing, /diagnostic,
 * /solutions, /research, /readiness or /start-pilot had no route to the terms,
 * privacy notice, or data-processing page at all.
 *
 * That matters more here than on a normal marketing site: this product is sold
 * to regulated buyers whose procurement asks for exactly those documents, and
 * a privacy notice has to be reachable to do its job.
 *
 * Rendered by the public shell in app/layout.tsx for every public page except
 * the two that already include it themselves.
 */

const footerLinks: Array<{ heading: string; items: Array<{ label: string; href: string }> }> = [
  {
    heading: "Product",
    items: [
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Research", href: "/research" },
      { label: "NexusAI", href: "/workspace" },
      { label: "Quorum", href: "/board" },
      { label: "Meridian", href: "/meridian" },
      { label: "Vantage", href: "/vantage" },
      { label: "Nucleus", href: "/nucleus" },
    ],
  },
  {
    heading: "Trust",
    items: [
      { label: "Security", href: "/security" },
      { label: "Data processing", href: "/data-processing" },
      { label: "Acceptable use", href: "/acceptable-use" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Get started",
    items: [
      { label: "Start pilot", href: "/start-pilot" },
      { label: "Readiness check", href: "/readiness" },
      { label: "Product brief", href: "/product-brief" },
      { label: "Contact", href: "mailto:hello@pinavia.io" },
    ],
  },
];

function ExternalOrInternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} prefetch={false}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="space-y-3">
            <PinaviaLockup descriptor="" />
            <p className="max-w-xs text-xs leading-5 text-white/45">
              Governed AI for executive teams, boards, regulated workflows, diligence teams, and
              advisory firms.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading}>
              <p className="text-xs uppercase text-white/35">{group.heading}</p>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <ExternalOrInternalLink
                      href={item.href}
                      className="rounded text-sm text-white/55 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent"
                    >
                      {item.label}
                    </ExternalOrInternalLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-xs text-white/35">
            Copyright {new Date().getFullYear()} Pinavia. All rights reserved.
          </p>
          <p className="text-xs text-white/35">
            Evidence-first by design. Humans approve anything that leaves the system.
          </p>
        </div>
      </div>
    </footer>
  );
}
