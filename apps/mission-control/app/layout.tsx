import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { SideNav } from "@/components/side-nav";
import { TrialBanner } from "@/components/trial-banner";
import { FeedbackButton } from "@/components/feedback-button";
import { ModeProvider, ModeIndicator } from "@/lib/mode-context";
import { TrustDrawerProvider } from "@/lib/trust-drawer-context";
import { TrustDrawer } from "@/components/trust-drawer";
import { safeAuth } from "@/lib/safe-auth";
import { headers } from "next/headers";
import { repository } from "@/lib/data/repository";
import { isDbRequired } from "@/lib/data/db-policy";
import { PRODUCT_META, productFromHost, type ProductKey } from "@/lib/product-detection";

export const metadata: Metadata = {
  title: "NexusAI Mission Control",
  description: "Executive intelligence pilot control surface",
  applicationName: "NexusAI Mission Control",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NexusAI"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#080d18"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-nexus-pathname") ?? "";
  const productKey: ProductKey = productFromHost(hdrs.get("x-nexus-product") ?? hdrs.get("host") ?? "");
  const product = PRODUCT_META[productKey];
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
    const logoInitial = product.name.charAt(0);
    return (
      <html lang="en">
        <body>
          <PwaRegister />
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090f1b]/88 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <a href="/" className="flex items-center gap-3 text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-nexus-accent text-sm font-semibold text-[#04100d]">
                  {logoInitial}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold leading-tight">{product.name}</span>
                  <span className="text-[10px] leading-tight text-white/35">{product.subtitle}</span>
                </div>
              </a>
              <div className="flex items-center gap-2">
                <a href="/product-brief" className="hidden rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
                  Product brief
                </a>
                <a href="/readiness" className="hidden rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
                  Readiness
                </a>
                <a href="/sign-in" className="btn-primary text-sm">Sign in</a>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    );
  }

  const health = await repository.healthCheck();
  if (!health.ok && isDbRequired()) {
    return (
      <html lang="en">
        <body>
          <PwaRegister />
          <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-white">
            <h1 className="mb-3 text-2xl font-semibold">
              Mission Control is waiting for database connectivity
            </h1>
            <p className="rounded-lg border border-red-300/40 bg-red-300/10 p-4 text-sm text-red-100">
              DB-required mode is enabled and startup health checks failed.
              Set a valid <code>DATABASE_URL</code> and run migrations before retrying.
            </p>
          </main>
        </body>
      </html>
    );
  }

  const { userId, orgId } = await safeAuth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  // Unauthenticated shell — middleware redirects to /sign-in but we render
  // a bare frame in case the redirect hasn't fired yet.
  if (!userId) {
    return (
      <html lang="en">
        <body>
          <PwaRegister />
          <header className="flex items-center justify-end gap-3 border-b border-white/10 px-6 py-3">
            <a href="/sign-in" className="btn-primary text-sm">Sign in</a>
          </header>
          <main className="min-h-screen p-6">{children}</main>
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
        <PwaRegister />
        <main className="flex min-h-screen flex-col md:flex-row">
          <TrustDrawerProvider>
          <ModeProvider>
          <SideNav />
          <div className="w-full min-w-0 p-3 sm:p-5 lg:p-6">
            {/* Top bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/70 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
              <div className="flex items-center gap-4">
                <span className="rounded border border-white/10 px-2 py-1 text-xs text-white/40">
                  {orgId ? "Organization workspace" : "Personal workspace"}
                </span>
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
              <a href="/settings/workspace" className="rounded border border-white/10 px-2 py-1 text-xs text-white/50 transition hover:text-white">
                Account
              </a>
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
          <TrustDrawer />
          </ModeProvider>
          </TrustDrawerProvider>
        </main>
        <FeedbackButton />
      </body>
    </html>
  );
}
