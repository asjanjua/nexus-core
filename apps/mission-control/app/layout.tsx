import type { Metadata } from "next";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import {
  ClerkProvider,
  UserButton,
  OrganizationSwitcher,
  SignInButton,
  SignedIn,
  SignedOut
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { repository } from "@/lib/data/repository";
import { isDbRequired } from "@/lib/data/db-policy";

export const metadata: Metadata = {
  title: "NexusAI Mission Control",
  description: "Executive intelligence pilot control surface"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const health = await repository.healthCheck();
  if (!health.ok && isDbRequired()) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider>
            <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-white">
              <h1 className="mb-3 text-2xl font-semibold">
                Mission Control is waiting for database connectivity
              </h1>
              <p className="rounded-lg border border-red-300/40 bg-red-300/10 p-4 text-sm text-red-100">
                DB-required mode is enabled and startup health checks failed.
                Set a valid <code>DATABASE_URL</code> and run migrations before retrying.
              </p>
            </main>
          </ClerkProvider>
        </body>
      </html>
    );
  }

  const { userId, orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  // Unauthenticated shell — middleware redirects to /sign-in but we render
  // a bare frame in case the redirect hasn't fired yet.
  if (!userId) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider>
            <header className="flex items-center justify-end gap-3 px-6 py-3 border-b border-white/10">
              <SignedOut>
                <SignInButton mode="redirect">
                  <button className="btn-primary text-sm">Sign in</button>
                </SignInButton>
              </SignedOut>
            </header>
            <main className="min-h-screen p-6">{children}</main>
          </ClerkProvider>
        </body>
      </html>
    );
  }

  const rows = await repository.getEvidenceForWorkspace(workspaceId);
  const staleFound = rows.some(
    (row) => row.ingestionStatus === "processed" && row.freshnessHours > 168
  );

  return (
    <html lang="en">
      <body>
        <ClerkProvider afterSignOutUrl="/sign-in">
          <main className="flex min-h-screen">
            <SideNav />
            <div className="w-full p-6">
              {/* Top bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                <div className="flex items-center gap-4">
                  <SignedIn>
                    <OrganizationSwitcher
                      hidePersonal
                      afterCreateOrganizationUrl="/onboarding"
                      afterSelectOrganizationUrl="/dashboard/ceo"
                      appearance={{
                        elements: {
                          rootBox: "text-xs",
                          organizationSwitcherTrigger:
                            "text-white/70 hover:text-white text-xs py-1 px-2 rounded border border-white/10 bg-transparent",
                          organizationSwitcherPopoverCard:
                            "bg-[#101a2f] border border-white/10",
                          organizationSwitcherPopoverActionButton:
                            "text-white/70 hover:text-white",
                        },
                      }}
                    />
                  </SignedIn>
                  <span>workspace: {workspaceId}</span>
                  <span>mode: {process.env.NEXUS_ENV ?? "pilot"}</span>
                </div>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "w-7 h-7" },
                    }}
                  />
                </SignedIn>
              </div>

              {staleFound && (
                <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                  Stale-data warning: one or more records exceed freshness policy and should be reviewed.
                </div>
              )}

              {children}
            </div>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
