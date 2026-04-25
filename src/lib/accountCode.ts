/** Human-readable account code: U + YY + MM + per-month sequence (matches Super Admin users). */

export type AuthUserLite = { id: string; created_at?: string | null };

export function computeAccountCodes(users: AuthUserLite[]): Map<string, string> {
  const sorted = [...users].sort(
    (a, b) =>
      new Date(String(a.created_at || 0)).getTime() - new Date(String(b.created_at || 0)).getTime()
  );
  const monthSeq = new Map<string, number>();
  const codeByUser = new Map<string, string>();
  for (const u of sorted) {
    const dt = u.created_at ? new Date(u.created_at) : new Date();
    const yy = String(dt.getFullYear()).slice(-2);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const key = `${yy}${mm}`;
    const n = (monthSeq.get(key) || 0) + 1;
    monthSeq.set(key, n);
    codeByUser.set(u.id, `U${yy}${mm}${n}`);
  }
  return codeByUser;
}
