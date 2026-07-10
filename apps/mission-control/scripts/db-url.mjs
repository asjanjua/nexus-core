const STRICT_SSL_MODE = "verify-full";
const AMBIGUOUS_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode && AMBIGUOUS_SSL_MODES.has(sslMode.toLowerCase())) {
      url.searchParams.set("sslmode", STRICT_SSL_MODE);
      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}
