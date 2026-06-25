import type { Metadata } from "next";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { TrialBanner } from "@/components/trial-banner";
import { FeedbackButton } from "@/components/feedback-button";
import { ModeProvider, ModeIndicator } from "@/lib/mode-context";
import {
  ClerkProvider,
  UserButton,
  OrganizationSwitcher,
  SignInButton,
  SignedIn,
  SignedOut
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { repository } from "@/lib/data/repository";
import { isDbRequired } from "@/lib/data/db-policy";

export const metadata: Metadata = {
  title: "NexusAI Mission Control",
  description: "Executive intelligence pilot control surface"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-nexus-pathname") ?? "";
  const isPublicShell =
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/start-pilot" ||
    pathname === "/workspace" ||
    pathname.startsWith("/readiness") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/security") ||
    pathname.startsWith("/acceptable-use") ||
    pathname.startsWith("/data-processing") ||
    pathname.startsWith("/product-brief");

  if (isPublicShell) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard/ceo"
            signUpFallbackRedirectUrl="/onboarding"
          >
            <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090f1b]/88 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <a href="/" className="flex items-center gap-3 text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-nexus-accent text-sm font-semibold text-[#04100d]">
                    N
                  </span>
                  <span className="font-semibold">Nexus Core</span>
                </a>
                <div className="flex items-center gap-2">
                  <a href="/product-brief" className="hidden rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
                    Product brief
                  </a>
                  <a href="/readiness" className="hidden rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
                    Readiness
                  </a>
                  <SignedOut>
                    <SignInButton mode="redirect">
                      <button className="btn-primary text-sm">Sign in</button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
                  </SignedIn>
                </div>
              </div>
            </header>
            {children}
          </ClerkProvider>
        </body>
      </html>
    );
  }

  const health = await repository.healthCheck();
  if (!health.ok && isDbRequired()) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard/ceo"
            signUpFallbackRedirectUrl="/onboarding"
          >
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
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  // Unauthenticated shell — middleware redirects to /sign-in but we render
  // a bare frame in case the redirect hasn't fired yet.
  if (!userId) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard/ceo"
            signUpFallbackRedirectUrl="/onboarding"
          >
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

  const [rows, workspaceStatus, settings] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getWorkspaceStatus(workspaceId),
    repository.getWorkspaceSettings(workspaceId),
  ]);
  const staleFound = rows.some(
    (row) => row.ingestionStatus === "processed" && row.freshnessHours > 168
  );

  return (
    <html lang="en">
      <body>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard/ceo"
          signUpFallbackRedirectUrl="/onboarding"
          afterSignOutUrl="/sign-in"
        >
          <main className="flex min-h-screen flex-col md:flex-row">
            <ModeProvider>
            <SideNav />
            <div className="w-full min-w-0 p-3 sm:p-5 lg:p-6">
              {/* Top bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/70 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                <div className="flex items-center gap-4">
                  <SignedIn>
                    {orgId ? (
                      <OrganizationSwitcher
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
                    ) : (
                      <span className="rounded border border-white/10 px-2 py-1 text-xs text-white/40">
                        Personal workspace
                      </span>
                    )}
                  </SignedIn>
                  <span
                    className="font-mono text-white/30"
                    title={workspaceId}
                  >
                    {workspaceId.length > 20 ? `${workspaceId.slice(0, 16)}…` : workspaceId}
                  </span>
                  <span className="text-white/30">mode: {process.env.NEXUS_ENV ?? "pilot"}</span>
                  <ModeIndicator />
                  {settings?.demoMode && (
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300">
                      DEMO
                    </span>
                  )}
                </div>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "w-7 h-7" },
                    }}
                  />
                </SignedIn>
              </div>

              {workspaceStatus.status === "trial" && (
                <TrialBanner trialEndsAt={workspaceStatus.trialEndsAt} />
              )}

              {workspaceStatus.status === "suspended" && (
                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-100">
                  This workspace has been suspended. Evidence and settings are preserved.{" "}
                  <a href="mailto:support@nexusai.io" className="underline hover:text-red-50">
                    Contact support to reactivate.
                  </a>
                </div>
              )}

              {staleFound && (
                <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                  One or more evidence records are older than 7 days.{" "}
                  <a href="/ingestion" className="underline hover:text-amber-50">Re-ingest updated files</a>{" "}
                  or{" "}
                  <a href="/sources" className="underline hover:text-amber-50">review your sources</a>.
                </div>
              )}

              {children}
            </div>
            </ModeProvider>
          </main>
          <FeedbackButton />
        </ClerkProvider>
      </body>
    </html>
  );
}
