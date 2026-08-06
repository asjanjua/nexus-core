import type { MetadataRoute } from "next";

/**
 * Public sitemap. Only routes a visitor can reach WITHOUT a session belong
 * here — authenticated workspace surfaces (dashboard, ask, approvals,
 * decisions, evidence, settings) must never be listed, both because they
 * redirect to sign-in and because listing them invites crawler noise on
 * rate-limited endpoints.
 *
 * Keep in sync with robots.ts.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinavia.io";

type Entry = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const PUBLIC_ROUTES: Entry[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  // Commercial entry points — these are the conversion surfaces.
  { path: "/readiness", priority: 0.9, changeFrequency: "monthly" },
  { path: "/diagnostic", priority: 0.9, changeFrequency: "monthly" },
  { path: "/start-pilot", priority: 0.9, changeFrequency: "monthly" },
  { path: "/product-brief", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/status", priority: 0.6, changeFrequency: "hourly" },
  { path: "/support", priority: 0.7, changeFrequency: "monthly" },
  { path: "/compliance", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pilot-sla", priority: 0.7, changeFrequency: "monthly" },
  { path: "/solutions", priority: 0.8, changeFrequency: "monthly" },
  { path: "/research", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pro-waitlist", priority: 0.6, changeFrequency: "monthly" },
  // Trust and legal — regulated buyers read these before they talk to you.
  { path: "/security", priority: 0.7, changeFrequency: "monthly" },
  { path: "/data-processing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/acceptable-use", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
