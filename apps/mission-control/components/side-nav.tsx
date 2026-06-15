"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "Agent Rooms",
    items: [
      { href: "/dashboard/ceo", label: "Executive Room" },
      { href: "/dashboard/coo", label: "Operating Room" },
      { href: "/dashboard/cbo", label: "Growth Room" },
      { href: "/dashboard/cto", label: "Technology Room" },
      { href: "/dashboard/cfo", label: "Finance Room" },
      { href: "/dashboard/cro", label: "Risk Room" },
      { href: "/dashboard/chro", label: "People Room" }
    ]
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ask", label: "Ask" },
      { href: "/recommendations", label: "Recommendations" },
      { href: "/decisions", label: "Decisions" },
      { href: "/entities", label: "Company Memory" },
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
    label: "Exports",
    items: [
      { href: "/export", label: "Export Hub" },
      { href: "/export/weekly-brief", label: "Weekly Brief" },
      { href: "/export/one-pager", label: "One-Pager" },
      { href: "/pilot-kit", label: "Pilot Kit" },
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
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <div className="border-b border-white/10 bg-[#090f1b]/95 p-3 md:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <span className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-nexus-accent text-xs text-[#04100d]">
                N
              </span>
              Nexus
            </span>
            <span className="text-white/40 transition group-open:rotate-180">⌄</span>
          </summary>
          <nav className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto rounded-lg border border-white/10 bg-[#0b1220] p-3">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="mb-1.5 px-2 text-xs uppercase text-white/30">{section.label}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "block rounded-md px-3 py-2 text-sm transition",
                        isActive(item.href)
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </details>
      </div>

      <aside className="hidden min-h-screen w-full max-w-[17rem] shrink-0 border-r border-white/10 bg-[#090f1b]/90 p-4 md:block">
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-nexus-accent text-sm font-semibold text-[#04100d]">
            N
          </span>
          <div>
            <p className="font-semibold text-white">Nexus</p>
            <p className="text-xs text-white/40">Mission Control</p>
          </div>
        </div>
        <nav className="space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-xs uppercase text-white/30">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block rounded-lg border px-3 py-2 text-sm transition",
                      isActive(item.href)
                        ? "border-nexus-accent/30 bg-nexus-accent/10 text-white font-medium"
                        : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
