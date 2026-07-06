/**
 * Product detection from request hostname.
 *
 * Maps subdomains to product keys so the middleware, layout, and routes
 * can switch branding, metadata, and behavior per product without separate
 * deployments. Clerk auth is shared — workspace isolation handles tenancy.
 *
 *  nexus.pinavia.io     → nexusai  (flagship)
 *  quorum.pinavia.io    → quorum   (board intelligence)
 *  meridian.pinavia.io  → meridian (regulatory submissions)
 *  vantage.pinavia.io   → vantage  (due diligence copilot)
 *  nucleus.pinavia.io   → nucleus  (white-label platform)
 *  app.pinavia.io       → nexusai  (app root, for demos)
 *  localhost            → nexusai  (dev default)
 */

export type ProductKey = "nexusai" | "quorum" | "meridian" | "vantage" | "nucleus";

export type ProductMeta = {
  key: ProductKey;
  name: string;
  title: string;
  description: string;
  subtitle: string;
};

export const PRODUCT_META: Record<ProductKey, ProductMeta> = {
  nexusai: {
    key: "nexusai",
    name: "NexusAI",
    title: "NexusAI Mission Control",
    description: "The governed operating layer for executive work.",
    subtitle: "a Pinavia product",
  },
  quorum: {
    key: "quorum",
    name: "Quorum",
    title: "Quorum — Board Intelligence",
    description: "Your board pack that reads, answers, and remembers itself.",
    subtitle: "a Pinavia product",
  },
  meridian: {
    key: "meridian",
    name: "Meridian",
    title: "Meridian — Regulatory Submissions",
    description: "Submission-ready drafts, every claim traceable to your own evidence.",
    subtitle: "a Pinavia product",
  },
  vantage: {
    key: "vantage",
    name: "Vantage",
    title: "Vantage — Due Diligence Copilot",
    description: "First-pass due diligence in days, every flag cited to its source.",
    subtitle: "a Pinavia product",
  },
  nucleus: {
    key: "nucleus",
    name: "Nucleus",
    title: "Nucleus — White-Label AI Platform",
    description: "Your firm's own AI analyst platform, without building it yourselves.",
    subtitle: "a Pinavia product",
  },
};

const SUBDOMAIN_PRODUCT: Record<string, ProductKey> = {
  nexus: "nexusai",
  nexusai: "nexusai",
  app: "nexusai",
  quorum: "quorum",
  meridian: "meridian",
  vantage: "vantage",
  nucleus: "nucleus",
};

/**
 * Detect product from the request hostname.
 * Falls back to "nexusai" for localhost or unrecognized hosts.
 */
export function productFromHost(host: string): ProductKey {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  // Local dev
  if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.")) {
    return "nexusai";
  }

  // pinavia.io subdomains
  if (hostname.endsWith(".pinavia.io")) {
    const subdomain = hostname.replace(".pinavia.io", "").split(".").pop() ?? "";
    return SUBDOMAIN_PRODUCT[subdomain] ?? "nexusai";
  }

  // Render preview URLs — treat as nexusai by default
  if (hostname.includes("onrender.com")) {
    return "nexusai";
  }

  // Explicit product mapping or fallback
  return SUBDOMAIN_PRODUCT[hostname] ?? "nexusai";
}

/**
 * All product origins for CORS and Clerk configuration.
 */
export function productOrigins(): string[] {
  const origins = ["app.pinavia.io", "nexus.pinavia.io"];
  for (const key of Object.keys(SUBDOMAIN_PRODUCT)) {
    if (key !== "app" && key !== "nexus" && key !== "nexusai") {
      origins.push(`${key}.pinavia.io`);
    }
  }
  // Deduplicate
  return [...new Set(origins)];
}

/**
 * Product-specific route prefix. Routes are path-based, not subdomain-based.
 * Subdomain switching is branding only — the route tree is shared.
 */
export function productRoutePrefix(product: ProductKey): string {
  const prefixes: Record<ProductKey, string> = {
    nexusai: "/dashboard",
    quorum: "/board",
    meridian: "/meridian",
    vantage: "/vantage",
    nucleus: "/nucleus",
  };
  return prefixes[product];
}

/**
 * Safe post-auth landing path for the current product surface.
 *
 * Product route prefixes can point to planned surfaces, but Clerk redirects
 * must only target routes that exist today. Quorum is live at /board; the
 * remaining pivot surfaces fall back to the main executive room until their
 * dedicated routes ship.
 */
export function productSignInRedirect(product: ProductKey): string {
  const redirects: Record<ProductKey, string> = {
    nexusai: "/dashboard/ceo",
    quorum: "/board",
    meridian: "/dashboard/ceo",
    vantage: "/dashboard/ceo",
    nucleus: "/dashboard/ceo",
  };
  return redirects[product];
}
