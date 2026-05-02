import Link from "next/link";

const navSections = [
  {
    label: "Dashboards",
    items: [
      { href: "/dashboard/ceo", label: "CEO Command Brief" },
      { href: "/dashboard/coo", label: "COO Execution View" },
      { href: "/dashboard/cbo", label: "CBO / Strategy" },
      { href: "/dashboard/cto", label: "CTO / CDO" }
    ]
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ask", label: "Ask" },
      { href: "/recommendations", label: "Recommendations" },
      { href: "/decisions", label: "Decisions" },
      { href: "/approvals", label: "Approvals" },
      { href: "/review", label: "Review Queue" }
    ]
  },
  {
    label: "Data",
    items: [
      { href: "/sources", label: "Sources" },
      { href: "/ingestion", label: "Ingestion" }
    ]
  },
  {
    label: "Configuration",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/connectors", label: "Connectors" },
      { href: "/settings/workspace", label: "Workspace" },
      { href: "/settings/policies", label: "Policies" },
    ]
  }
];

export function SideNav() {
  return (
    <aside className="w-full max-w-xs shrink-0 border-r border-white/10 bg-black/20 p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">NexusAI</p>
      <nav className="space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-xs uppercase tracking-wide text-white/30">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
