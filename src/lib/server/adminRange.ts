const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
const DAY = 24 * 60 * 60 * 1000;

/**
 * Parse an admin date range from query params:
 *   ?range=7d|30d|90d|365d   (rolling window ending now)
 *   ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD   (IST dates, "to" inclusive, max 3 years)
 */
export function parseAdminRange(
  sp: URLSearchParams
): { ok: true; range: string; from: Date; to: Date } | { ok: false; error: string } {
  const range = sp.get("range") || "30d";
  if (range !== "custom") {
    const to = new Date();
    return { ok: true, range, from: new Date(to.getTime() - (RANGE_DAYS[range] ?? 30) * DAY), to };
  }
  const f = sp.get("from");
  const t = sp.get("to");
  const from = f ? new Date(`${f}T00:00:00+05:30`) : null;
  const toStart = t ? new Date(`${t}T00:00:00+05:30`) : null;
  if (!from || !toStart || Number.isNaN(from.getTime()) || Number.isNaN(toStart.getTime()) || toStart < from) {
    return { ok: false, error: "Choose a valid From and To date" };
  }
  const to = new Date(toStart.getTime() + DAY);
  if (to.getTime() - from.getTime() > 3 * 366 * DAY) return { ok: false, error: "Custom range can be at most 3 years" };
  return { ok: true, range, from, to };
}
