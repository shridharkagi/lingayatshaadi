/** Human-readable account code: U + YY + MM + global sequence (never resets by month). */

export type AuthUserLite = { id: string; created_at?: string | null };

export function computeAccountCodes(users: AuthUserLite[]): Map<string, string> {
  const sorted = [...users].sort(
    (a, b) =>
      new Date(String(a.created_at || 0)).getTime() - new Date(String(b.created_at || 0)).getTime()
  );
  let globalSeq = 0;
  const codeByUser = new Map<string, string>();
  for (const u of sorted) {
    const dt = u.created_at ? new Date(u.created_at) : new Date();
    const yy = String(dt.getFullYear()).slice(-2);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    globalSeq += 1;
    codeByUser.set(u.id, `U${yy}${mm}${globalSeq}`);
  }
  return codeByUser;
}
