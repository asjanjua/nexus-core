/**
 * Redirect helpers shared by connector OAuth callback routes. Every provider
 * returns the user to /settings/connectors with either an `error` or an
 * `installed` query param.
 */

import { NextResponse } from "next/server";

const CONNECTOR_SETTINGS_PATH = "/settings/connectors";

export function connectorAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
