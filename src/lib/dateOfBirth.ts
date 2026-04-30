export function parseDobDdMmYyyyToIso(raw: string): string {
  const value = String(raw || "").trim();
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const currentYear = new Date().getFullYear();
  if (yyyy < 1900 || yyyy > currentYear || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return "";
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function formatIsoToDobDdMmYyyy(iso: string): string {
  const value = String(iso || "").trim();
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}
