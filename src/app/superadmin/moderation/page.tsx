"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  SkipForward,
  UserRound,
  X,
} from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";

type CheckItem = { level: "ok" | "warn" | "info"; title: string; detail: string };
type Photo = { id: string; url: string; status: string; is_primary?: boolean; rejection_reason?: string | null };
type Doc = { id: string; idType: string; fileType: string; fileName: string; url: string | null; createdAt: string };
type Item = {
  key: string;
  type: "new" | "edit" | "photo" | "kyc";
  submittedAt: string | null;
  profile: {
    id: string;
    publicId: string | null;
    name: string;
    gender: string | null;
    city: string | null;
    profession: string | null;
    age: number | null;
    relationship: string | null;
    photo: string | null;
  };
  account: { userId: string; accountCode: string | null; phone: string | null; name: string; profileCount: number };
  checks: CheckItem[];
  live?: Record<string, unknown>;
  snapshot?: Record<string, unknown> | null;
  photos?: Photo[];
  docs?: Doc[];
};

type Filter = "all" | "new" | "edit" | "photo" | "kyc";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "edit", label: "Edits" },
  { id: "photo", label: "Photos" },
  { id: "kyc", label: "KYC" },
];
const KIND: Record<Item["type"], { label: string; cls: string }> = {
  new: { label: "New profile", cls: "t-indigo" },
  edit: { label: "Edit after approval", cls: "t-amber" },
  photo: { label: "Photos", cls: "t-plum" },
  kyc: { label: "KYC", cls: "t-green" },
};
const REASONS: Record<Item["type"], string[]> = {
  new: ["Incomplete details", "Contact details in text", "Photo not clear / group photo", "Suspected duplicate", "Fake or test profile", "Not from Lingayat community"],
  edit: ["Contact details in text", "Incorrect information", "Photo not clear / group photo", "Inappropriate content"],
  photo: ["Photo not clear", "Group photo", "Not the member", "Inappropriate photo", "Contains contact details"],
  kyc: ["Document not readable", "Name doesn't match", "Wrong document type", "Expired document"],
};

// Fields shown in the change list / details, in display order.
const FIELDS: [string, string][] = [
  ["full_name", "Name"], ["gender", "Gender"], ["date_of_birth", "Date of birth"], ["marital_status", "Marital status"],
  ["height", "Height"], ["sub_caste", "Sub-caste"], ["mother_tongue", "Mother tongue"], ["languages_known", "Languages"],
  ["about_me", "About me"], ["hobbies", "Hobbies"], ["qualification", "Education"], ["profession_type", "Profession type"],
  ["profession", "Profession"], ["company_name", "Company"], ["annual_income", "Annual income"],
  ["time_of_birth", "Time of birth"], ["place_of_birth", "Place of birth"], ["rashi", "Rashi"], ["nakshatra", "Nakshatra"],
  ["horoscope_other_details", "Horoscope notes"], ["father_name", "Father"], ["father_occupation", "Father's occupation"],
  ["mother_name", "Mother"], ["mother_occupation", "Mother's occupation"], ["sibling_details", "Siblings"],
  ["family_other_details", "Family notes"], ["food_habits", "Food habits"], ["city", "City"], ["district", "District"],
  ["state", "State"], ["country", "Country"], ["profile_photo", "Main photo"], ["partner_preference", "Partner preferences"],
];

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== null && x !== "" && !(Array.isArray(x) && x.length === 0))
      .map(([k, x]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${Array.isArray(x) ? x.join("/") : String(x)}`);
    return parts.length ? parts.join(" · ") : "—";
  }
  return String(v);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
function ago(iso: string | null) {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
function phoneFmt(p: string | null) {
  const d = (p || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : "—";
}

type Pending = { item: Item; label: string; run: () => Promise<void>; timer: ReturnType<typeof setTimeout> };

export default function ReviewWorkspacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selKey, setSelKey] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/superadmin/review/queue");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load queue");
      setItems(json.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => items.filter((i) => i.key !== pending?.item.key && (filter === "all" || i.type === filter)),
    [items, filter, pending]
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, new: 0, edit: 0, photo: 0, kyc: 0 };
    for (const i of items) {
      if (i.key === pending?.item.key) continue;
      c.all += 1;
      c[i.type] += 1;
    }
    return c;
  }, [items, pending]);

  const sel = visible.find((i) => i.key === selKey) || visible[0] || null;
  useEffect(() => {
    if (sel && sel.key !== selKey) setSelKey(sel.key);
  }, [sel, selKey]);
  useEffect(() => {
    setRejecting(false);
    setReason(null);
    setNote("");
  }, [sel?.key]);

  const flash = (text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4000);
  };

  const call = async (url: string, method: string, body: unknown) => {
    const res = await adminFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || `Request failed (${res.status})`);
    }
  };

  const commitPending = useCallback(async (p: Pending) => {
    try {
      await p.run();
      setItems((list) => list.filter((i) => i.key !== p.item.key));
    } catch (e) {
      flash(`Couldn't save “${p.item.profile.name}”: ${e instanceof Error ? e.message : "error"}`, "err");
    } finally {
      setPending((cur) => (cur?.item.key === p.item.key ? null : cur));
    }
  }, []);

  // Actions are held for 5 seconds so they can be undone, then sent.
  const schedule = (item: Item, label: string, run: () => Promise<void>) => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      void commitPending(pendingRef.current);
    }
    const idx = visible.findIndex((i) => i.key === item.key);
    const next = visible[idx + 1] || visible[idx - 1] || null;
    const p: Pending = { item, label, run, timer: setTimeout(() => void commitPending(p), 5000) };
    setPending(p);
    setSelKey(next?.key || null);
  };
  const undo = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    setSelKey(pending.item.key);
    setPending(null);
  };
  useEffect(() => () => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      void pendingRef.current.run();
    }
  }, []);

  const approve = (item: Item) => {
    const pendingPhotos = (item.photos || []).filter((p) => p.status === "pending");
    if (item.type === "new" || item.type === "edit") {
      schedule(item, `${item.profile.name} approved`, () =>
        call("/api/superadmin/moderation/profile", "POST", { profileId: item.profile.id, action: "approve" })
      );
    } else if (item.type === "photo") {
      schedule(item, `${pendingPhotos.length} photo(s) approved for ${item.profile.name}`, async () => {
        for (const ph of pendingPhotos) await call("/api/superadmin/moderation/photo", "POST", { photoId: ph.id, action: "approve" });
      });
    } else {
      schedule(item, `KYC approved for ${item.profile.name}`, async () => {
        for (const d of item.docs || []) await call(`/api/kyc-documents/${d.id}`, "PATCH", { status: "approved" });
      });
    }
  };
  const reject = (item: Item) => {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    if (!reason) {
      flash("Choose a reason first — the member will see it.", "err");
      return;
    }
    const full = note.trim() ? `${reason}. ${note.trim()}` : reason;
    const pendingPhotos = (item.photos || []).filter((p) => p.status === "pending");
    if (item.type === "new" || item.type === "edit") {
      schedule(item, `${item.profile.name} rejected · ${reason}`, () =>
        call("/api/superadmin/moderation/profile", "POST", { profileId: item.profile.id, action: "reject", reason: full })
      );
    } else if (item.type === "photo") {
      schedule(item, `Photos rejected for ${item.profile.name} · ${reason}`, async () => {
        for (const ph of pendingPhotos) await call("/api/superadmin/moderation/photo", "POST", { photoId: ph.id, action: "reject", reason: full });
      });
    } else {
      schedule(item, `KYC rejected for ${item.profile.name} · ${reason}`, async () => {
        for (const d of item.docs || []) await call(`/api/kyc-documents/${d.id}`, "PATCH", { status: "rejected", rejectionReason: full });
      });
    }
  };
  const move = (dir: 1 | -1) => {
    if (!visible.length) return;
    const idx = Math.max(0, visible.findIndex((i) => i.key === sel?.key));
    setSelKey(visible[(idx + dir + visible.length) % visible.length].key);
  };

  // Single photo approve / reject inside an item (immediate).
  const photoAction = async (item: Item, ph: Photo, action: "approve" | "reject") => {
    setBusyPhoto(ph.id);
    try {
      await call("/api/superadmin/moderation/photo", "POST", {
        photoId: ph.id,
        action,
        reason: action === "reject" ? "Photo not clear" : undefined,
      });
      setItems((list) =>
        list
          .map((i) =>
            i.key === item.key
              ? { ...i, photos: (i.photos || []).map((p) => (p.id === ph.id ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p)) }
              : i
          )
          .filter((i) => i.type !== "photo" || (i.photos || []).some((p) => p.status === "pending"))
      );
      flash(action === "approve" ? "Photo approved" : "Photo rejected");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Photo update failed", "err");
    } finally {
      setBusyPhoto(null);
    }
  };

  // Keyboard: A approve · R reject · J/K next/previous · Esc cancel reject.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || !sel) return;
      const k = e.key.toLowerCase();
      if (k === "a") approve(sel);
      else if (k === "r") reject(sel);
      else if (k === "j") move(1);
      else if (k === "k") move(-1);
      else if (k === "escape") setRejecting(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const changes = useMemo(() => {
    if (!sel || sel.type !== "edit" || !sel.live || !sel.snapshot) return [];
    return FIELDS.filter(([k]) => !same(sel.live?.[k], sel.snapshot?.[k])).map(([k, label]) => ({
      key: k,
      label,
      before: show(sel.snapshot?.[k]),
      after: show(sel.live?.[k]),
    }));
  }, [sel]);
  const details = useMemo(() => {
    if (!sel || sel.type !== "new" || !sel.live) return [];
    return FIELDS.filter(([k]) => k !== "profile_photo" && show(sel.live?.[k]) !== "—").map(([k, label]) => ({ label, value: show(sel.live?.[k]) }));
  }, [sel]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 className="ad-h1">Review</h1>
          <p className="ad-muted" style={{ margin: "4px 0 0" }}>
            Profiles, edits, photos and KYC in one queue. <span className="ad-kbd">A</span> approve ·{" "}
            <span className="ad-kbd">R</span> reject · <span className="ad-kbd">J</span>/<span className="ad-kbd">K</span> next/previous
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="ad-pills" role="tablist" aria-label="Queue filter">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`ad-pill ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>
                {f.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="ad-btn ghost" onClick={load} aria-label="Refresh queue">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && <div className="ad-card" style={{ color: "#b42358" }}>{error}</div>}

      <div className="rv-ws">
        <section className="ad-card rv-queue" aria-label="Review queue" style={{ padding: 0 }}>
          <div className="rv-qhead">
            <strong>Queue</strong>
            <span className="ad-muted" style={{ fontSize: 12 }}>Oldest first</span>
          </div>
          {loading && items.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="ad-skel" style={{ height: 64, margin: 12 }} />)}
          {!loading && visible.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }} className="ad-muted">
              <Check size={28} style={{ color: "#11734b", marginBottom: 8 }} />
              <div>All caught up — nothing waiting here.</div>
            </div>
          )}
          {visible.map((it) => (
            <button key={it.key} type="button" className={`rv-qi ${sel?.key === it.key ? "on" : ""}`} onClick={() => setSelKey(it.key)}>
              <span className="ad-av" style={{ background: it.profile.gender === "female" ? "#c2367a" : "#5b3aa8", width: 40, height: 40 }}>
                {it.profile.photo ? <img src={it.profile.photo} alt="" /> : initials(it.profile.name)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong className="rv-ellipsis">{it.profile.name}</strong>
                  <span className="ad-muted" style={{ fontSize: 12 }}>{ago(it.submittedAt)}</span>
                </span>
                <span className="ad-muted rv-ellipsis" style={{ display: "block", fontSize: 12 }}>
                  {it.profile.gender === "female" ? "Bride" : "Groom"}
                  {it.profile.age ? ` · ${it.profile.age}` : ""}
                  {it.profile.city ? ` · ${it.profile.city}` : ""}
                </span>
                <span className={`ad-chip ${KIND[it.type].cls}`} style={{ marginTop: 6 }}>
                  {KIND[it.type].label}
                  {it.type === "photo" ? ` · ${(it.photos || []).filter((p) => p.status === "pending").length}` : ""}
                  {it.type === "kyc" ? ` · ${(it.docs || []).length}` : ""}
                </span>
              </span>
            </button>
          ))}
        </section>

        <section className="rv-detail" aria-label="Selected item">
          {!sel ? (
            <div className="ad-card ad-muted" style={{ textAlign: "center", padding: 48 }}>
              {loading ? "Loading…" : "Select an item from the queue."}
            </div>
          ) : (
            <div key={sel.key} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "ad-rise .3s ease both" }}>
              <div className="ad-card rv-hero">
                <div className="rv-photo">
                  {sel.profile.photo ? <img src={sel.profile.photo} alt="" /> : <UserRound size={34} />}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{sel.profile.name}</h2>
                    <span className={`ad-chip ${KIND[sel.type].cls}`}>{KIND[sel.type].label}</span>
                  </div>
                  <div className="ad-muted" style={{ marginTop: 4 }}>
                    {sel.profile.publicId || "No member ID yet"} · {sel.profile.gender === "female" ? "Bride" : "Groom"}
                    {sel.profile.age ? ` · ${sel.profile.age}` : ""}
                    {sel.profile.city ? ` · ${sel.profile.city}` : ""}
                    {sel.profile.profession ? ` · ${sel.profile.profession}` : ""}
                  </div>
                  <div className="ad-muted" style={{ fontSize: 12, marginTop: 8 }}>
                    {[
                      `Account ${sel.account.accountCode || "—"}`,
                      phoneFmt(sel.account.phone),
                      sel.account.name,
                      `${sel.account.profileCount} profile${sel.account.profileCount === 1 ? "" : "s"}`,
                      sel.profile.relationship ? `for ${sel.profile.relationship}` : "",
                      `submitted ${ago(sel.submittedAt)} ago`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/superadmin/accounts/${sel.account.userId}`} className="ad-btn ghost">Account 360°</Link>
                  <Link href={`/superadmin/users/${sel.profile.id}/edit`} className="ad-btn ghost">
                    Edit <ExternalLink size={14} />
                  </Link>
                </div>
              </div>

              {sel.checks.length > 0 && (
                <div className="ad-card">
                  <h3 className="ad-h2" style={{ marginBottom: 12 }}>Automatic checks</h3>
                  <div className="rv-checks">
                    {sel.checks.map((c, i) => (
                      <div key={i} className="rv-check">
                        <span className={`ad-chip ${c.level === "ok" ? "t-green" : c.level === "warn" ? "t-amber" : "t-indigo"}`}>
                          {c.level === "ok" ? "OK" : c.level === "warn" ? "Check" : "Info"}
                        </span>
                        <div>
                          <strong style={{ fontSize: 13 }}>{c.title}</strong>
                          <div className="ad-muted" style={{ fontSize: 12 }}>{c.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sel.type === "edit" && (
                <div className="ad-card">
                  <h3 className="ad-h2" style={{ marginBottom: 12 }}>What changed since last approval</h3>
                  {changes.length === 0 ? (
                    <p className="ad-muted">No visible field changes — likely a photo or settings update.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="rv-diff">
                        <thead>
                          <tr><th>Field</th><th>Before (live now)</th><th>After (pending)</th></tr>
                        </thead>
                        <tbody>
                          {changes.map((c) => (
                            <tr key={c.key}>
                              <td><strong>{c.label}</strong></td>
                              <td><span className="rv-old">{c.before}</span></td>
                              <td><span className="rv-new">{c.after}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {sel.type === "new" && (
                <div className="ad-card">
                  <h3 className="ad-h2" style={{ marginBottom: 12 }}>Profile details</h3>
                  <div className="rv-details">
                    {details.map((d) => (
                      <div key={d.label}>
                        <div className="ad-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{d.label}</div>
                        <div style={{ fontSize: 14, marginTop: 2, wordBreak: "break-word" }}>{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(sel.photos || []).length > 0 && (
                <div className="ad-card">
                  <h3 className="ad-h2" style={{ marginBottom: 12 }}>Photos</h3>
                  <div className="rv-thumbs">
                    {(sel.photos || []).map((ph) => (
                      <div key={ph.id} className={`rv-th ${ph.status === "pending" ? "pending" : ""}`}>
                        <a href={ph.url} target="_blank" rel="noreferrer"><img src={ph.url} alt="" /></a>
                        <span className={`ad-chip ${ph.status === "approved" ? "t-green" : ph.status === "pending" ? "t-amber" : "t-rose"}`} style={{ position: "absolute", left: 6, top: 6 }}>
                          {ph.status}
                        </span>
                        {ph.status === "pending" && (
                          <div className="rv-th-actions">
                            <button type="button" aria-label="Approve photo" disabled={busyPhoto === ph.id} onClick={() => photoAction(sel, ph, "approve")}><Check size={16} /></button>
                            <button type="button" aria-label="Reject photo" disabled={busyPhoto === ph.id} onClick={() => photoAction(sel, ph, "reject")}><X size={16} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(sel.type === "new" || sel.type === "edit") && (
                    <p className="ad-muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Approving the profile also approves its pending photos.</p>
                  )}
                </div>
              )}

              {sel.type === "kyc" && (
                <div className="ad-card">
                  <h3 className="ad-h2" style={{ marginBottom: 12 }}>KYC documents</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {(sel.docs || []).map((d) => (
                      <a key={d.id} href={d.url || "#"} target="_blank" rel="noreferrer" className="rv-doc">
                        <span className="ad-ico t-indigo">{/image/.test(d.fileType || "") ? <ShieldCheck size={18} /> : <FileText size={18} />}</span>
                        <span style={{ flex: 1 }}>
                          <strong style={{ textTransform: "capitalize" }}>{(d.idType || "document").replace(/_/g, " ")}</strong>
                          <span className="ad-muted" style={{ display: "block", fontSize: 12 }}>{d.fileName} · uploaded {ago(d.createdAt)} ago</span>
                        </span>
                        <span className="ad-muted" style={{ fontSize: 12 }}>{d.url ? "Open ↗" : "File unavailable"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {rejecting && (
                <div className="ad-card" style={{ borderColor: "#f3c4d4" }}>
                  <h3 className="ad-h2" style={{ color: "#b42358", marginBottom: 10 }}>Reject — choose a reason (the member sees this)</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {REASONS[sel.type].map((r) => (
                      <button key={r} type="button" className={`rv-reason ${reason === r ? "on" : ""}`} onClick={() => setReason(r)}>{r}</button>
                    ))}
                  </div>
                  <label className="ad-muted" style={{ display: "block", fontSize: 12, marginTop: 12 }}>
                    Optional note to the member
                    <input className="rv-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please remove the phone number from About me" />
                  </label>
                </div>
              )}

              <div className="rv-bar">
                <button type="button" className="ad-btn rv-ok" onClick={() => approve(sel)}>
                  <Check size={16} /> Approve <span className="ad-kbd" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>A</span>
                </button>
                <button type="button" className="ad-btn rv-no" onClick={() => reject(sel)}>
                  <X size={16} /> {rejecting ? "Confirm reject" : "Reject"} <span className="ad-kbd">R</span>
                </button>
                {rejecting && <button type="button" className="ad-btn ghost" onClick={() => setRejecting(false)}>Cancel</button>}
                <span style={{ flex: 1 }} />
                <button type="button" className="ad-btn ghost" onClick={() => move(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
                <button type="button" className="ad-btn ghost" onClick={() => move(1)}>
                  Skip <SkipForward size={14} /> <ChevronRight size={16} style={{ display: "none" }} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {pending && (
        <div className="rv-toast" role="status">
          <span>{pending.label}</span>
          <button type="button" onClick={undo}>Undo</button>
        </div>
      )}
      {!pending && toast && (
        <div className={`rv-toast ${toast.tone === "err" ? "err" : ""}`} role="status">
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
