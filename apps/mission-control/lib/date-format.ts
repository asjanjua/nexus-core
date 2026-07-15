const UTC_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

/**
 * Formats a timestamp identically during server rendering and browser hydration.
 */
export function formatTimeUtc(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "time unavailable";
  }

  return UTC_TIME_FORMATTER.format(date);
}
