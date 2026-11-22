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

/**
 * Optional list date filter: ?from=YYYY-MM-DD&to=YYYY-MM-DD (IST days, "to" inclusive).
 * Either side may be empty. Returns ISO timestamps (or null) for the SQL functions.
 */
export function parseListDates(sp: URLSearchParams): { from: string | null; to: string | null } {
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+05:30`) : null);
  const f = day(sp.get("from"));
  const t = day(sp.get("to"));
  return {
    from: f && !Number.isNaN(f.getTime()) ? f.toISOString() : null,
    to: t && !Number.isNaN(t.getTime()) ? new Date(t.getTime() + DAY).toISOString() : null,
  };
}
