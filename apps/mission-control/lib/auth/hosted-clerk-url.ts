export function applicationOrigin(input: {
  host?: string | null;
  forwardedProto?: string | null;
  configuredAppUrl?: string | null;
}): string | null {
  const host = input.host?.trim();
  if (host) {
    const proto = input.forwardedProto?.split(",")[0]?.trim()
      || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      // Fall through to the configured canonical application URL.
    }
  }

  const configured = input.configuredAppUrl?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function hostedClerkUrl(input: {
  configuredUrl?: string | null;
  redirectPath: string;
  appOrigin: string | null;
}): string | null {
  const configured = input.configuredUrl?.trim();
  if (!configured || configured.startsWith("/") || !input.appOrigin) return null;

  try {
    const hosted = new URL(configured);
    const redirect = new URL(input.redirectPath, `${input.appOrigin}/`);
    if (redirect.origin !== input.appOrigin) return null;
    hosted.searchParams.set("redirect_url", redirect.toString());
    return hosted.toString();
  } catch {
    return null;
  }
}
