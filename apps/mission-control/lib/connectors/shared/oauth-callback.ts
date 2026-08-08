/**
 * Redirect helpers shared by connector OAuth callback routes. Every provider
 * returns the user to /settings/connectors with either an `error` or an
 * `installed` query param.
 */

import { NextResponse } from "next/server";
import { isExplicitDevRuntime } from "@/lib/security";

const CONNECTOR_SETTINGS_PATH = "/settings/connectors";

/**
 * Base URL the connector OAuth round trip returns the user to.
 *
 * Fails closed outside an explicitly declared dev/test runtime. The previous
 * unconditional `?? "http://localhost:3000"` meant that with
 * NEXT_PUBLIC_APP_URL unset in production, every connector install redirected
 * the customer to their own localhost — at the highest-intent moment in
 * onboarding, and looking like the product was broken.
 *
 * lib/connectors/outlook-mail.ts already threw in this situation; the refactor
 * that created this shared module extracted the weaker of the two patterns.
 * This restores the stricter one for every provider.
 */
export function connectorAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (isExplicitDevRuntime()) return "http://localhost:3000";
  throw new Error(
    "NEXT_PUBLIC_APP_URL is required to build connector OAuth redirects unless NODE_ENV is explicitly development or test"
  );
}

function redirectToSettings(
  appUrl: string,
  param: "error" | "installed",
  value: string
): NextResponse {
  const url = new URL(CONNECTOR_SETTINGS_PATH, appUrl);
  url.searchParams.set(param, value);
  return NextResponse.redirect(url.toString());
}

export function redirectWithConnectorError(
  appUrl: string,
  error: string
): NextResponse {
  return redirectToSettings(appUrl, "error", error);
}

export function redirectWithConnectorInstalled(
  appUrl: string,
  label: string
): NextResponse {
  return redirectToSettings(appUrl, "installed", label);
}
