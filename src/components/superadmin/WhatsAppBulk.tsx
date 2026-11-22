"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { phoneDigits, phoneFmt } from "./ui";

export type WaRecipient = { id: string; name: string; phone: string | null; planEnds?: string | null };

const SITE = "https://www.lingayatbandhu.com";
const TEMPLATES: { id: string; label: string; text: string }[] = [
  {
    id: "no_profile",
    label: "Finish your profile",
    text: `Namaskara {name}, thank you for joining LingayatBandhu. Your account is ready, but your matrimony profile isn't created yet. It takes only 5 minutes: ${SITE}/login`,
  },
  {
    id: "pending",
    label: "Profile under review",
    text: `Namaskara {name}, we have received your LingayatBandhu profile and it is under review. We will let you know once it is live. Reply here if you need any help.`,
  },
  {
    id: "inactive",
    label: "We miss you (inactive)",
    text: `Namaskara {name}, new Lingayat profiles have joined LingayatBandhu since your last visit. Log in to see matches: ${SITE}/login`,
  },
  {
    id: "expiring",
    label: "Plan ending soon",
    text: `Namaskara {name}, your LingayatBandhu plan ends on {planEnds}. Renew now to keep viewing contact details. Reply here to renew.`,
  },
  { id: "custom", label: "Custom message", text: `Namaskara {name}, ` },
];

const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] || "";
const fill = (t: string, r: WaRecipient) =>
  t
    .replace(/\{name\}/g, firstName(r.name))
    .replace(/\{planEnds\}/g, r.planEnds ? new Date(r.planEnds).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "soon")
    .replace(/ ,/g, ",")
    .replace(/\s{2,}/g, " ");

/**
 * Bulk WhatsApp helper. Browsers allow only one new tab per click, so this is a
 * queue: one click per person opens WhatsApp with the message pre-filled, ticks
 * them off and (optionally) logs a note on the account.
 */
export default function WhatsAppBulk({
  recipients, suggested, onClose,
}: { recipients: WaRecipient[]; suggested?: string; onClose: () => void }) {
  const [tpl, setTpl] = useState(suggested && TEMPLATES.some((t) => t.id === suggested) ? suggested : "no_profile");
  const [text, setText] = useState(TEMPLATES.find((t) => t.id === tpl)!.text);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [logNote, setLogNote] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => setText(TEMPLATES.find((t) => t.id === tpl)!.text), [tpl]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const withPhone = useMemo(() => recipients.filter((r) => phoneDigits(r.phone).length >= 10), [recipients]);
  const next = withPhone.find((r) => !sent.has(r.id));

  const send = (r: WaRecipient) => {
    const msg = fill(text, r);
    window.open(`https://wa.me/${phoneDigits(r.phone)}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    setSent((s) => new Set(s).add(r.id));
    if (logNote) {
      const label = TEMPLATES.find((t) => t.id === tpl)?.label || "Message";
      adminFetch(`/api/superadmin/accounts/${r.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: `WhatsApp sent (${label}): ${msg.slice(0, 300)}` }),
      }).catch(() => undefined);
    }
  };

  const copyNumbers = async () => {
    try {
      await navigator.clipboard.writeText(withPhone.map((r) => `+${phoneDigits(r.phone)}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const preview = withPhone[0] ? fill(text, withPhone[0]) : text;

  return (
    <div className="wa-scrim" onClick={onClose}>
      <div className="wa-panel sa-card" role="dialog" aria-modal="true" aria-label="Send WhatsApp messages" onClick={(e) => e.stopPropagation()}>
        <div className="wa-head">
          <div>
            <h2 className="sa-h2" style={{ margin: 0 }}><MessageCircle size={18} /> WhatsApp {recipients.length} account{recipients.length === 1 ? "" : "s"}</h2>
            <p className="sa-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Click <strong>Send</strong> for each person. WhatsApp opens with the message ready; press send there.
            </p>
          </div>
          <button type="button" className="sa-btn ghost" style={{ width: 36, padding: 0 }} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="wa-body">
          <div className="wa-compose">
            <label className="sa-muted" style={{ fontSize: 12 }}>Template</label>
            <select className="sa-select" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <label className="sa-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Message — <code>{"{name}"}</code> becomes the first name{tpl === "expiring" && <>, <code>{"{planEnds}"}</code> the plan end date</>}
            </label>
            <textarea className="sa-input" rows={6} value={text} onChange={(e) => setText(e.target.value)} style={{ height: "auto", padding: 10, resize: "vertical" }} />
            <div className="wa-preview"><span className="sa-muted" style={{ fontSize: 11 }}>Preview</span>{preview}</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 6 }}>
              <input type="checkbox" checked={logNote} onChange={(e) => setLogNote(e.target.checked)} /> Log a note on each account
            </label>
          </div>

          <div className="wa-list">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{sent.size} of {withPhone.length} sent</strong>
              <div className="wa-progress"><span style={{ width: `${withPhone.length ? (sent.size / withPhone.length) * 100 : 0}%` }} /></div>
              <button type="button" className="sa-btn ghost" style={{ minHeight: 30, fontSize: 12 }} onClick={copyNumbers}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy numbers"}
              </button>
            </div>
            {next && (
              <button type="button" className="sa-btn pri" style={{ width: "100%", marginBottom: 8 }} onClick={() => send(next)}>
                <MessageCircle size={16} /> Send to next: {next.name || phoneFmt(next.phone)}
              </button>
            )}
            {!next && withPhone.length > 0 && <div className="m3-ok" style={{ marginBottom: 8 }}>All done 🎉</div>}
            <div className="wa-rows">
              {recipients.map((r) => {
                const ok = phoneDigits(r.phone).length >= 10;
                const done = sent.has(r.id);
                return (
                  <div key={r.id} className={`wa-row ${done ? "done" : ""}`}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "Unnamed"}</div>
                      <div className="sa-muted" style={{ fontSize: 11 }}>{ok ? phoneFmt(r.phone) : "No phone"}</div>
                    </div>
                    {ok && (
                      <button type="button" className={`sa-btn ${done ? "ghost" : "ghost"}`} style={{ minHeight: 30, fontSize: 12 }} onClick={() => send(r)}>
                        {done ? <><Check size={14} /> Sent · again</> : "Send"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
