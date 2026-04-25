"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api/adminClient";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionRow = {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
  plan_name_snapshot?: string;
  price_snapshot?: number;
  currency_snapshot?: string;
};

type TransactionRow = {
  id: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  external_txn_id?: string;
  paid_at?: string;
  created_at?: string;
  payment_mode?: string;
  payer_source?: string;
};

type Filter = "all" | "active" | "expired" | "refunded";

function formatDate(dateLike?: string) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function AccountSubscriptionsTimelinePage() {
  const router = useRouter();
  const { authUser, isLoggedIn, loading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [asOfMs, setAsOfMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    subscriptions: SubscriptionRow[];
    transactions: TransactionRow[];
  }>({ subscriptions: [], transactions: [] });

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    const load = async () => {
      if (!authUser) return;
      setError(null);
      const res = await adminFetch("/api/subscriptions/history");
      const json = (await res.json()) as {
        error?: string;
        subscriptions?: SubscriptionRow[];
        transactions?: TransactionRow[];
      };
      if (!res.ok) {
        setError(json.error || "Failed to load subscription history");
        return;
      }
      setData({
        subscriptions: json.subscriptions || [],
        transactions: json.transactions || [],
      });
    };
    void load();
  }, [authUser]);

  useEffect(() => {
    setAsOfMs(Date.now());
  }, [data.subscriptions, data.transactions]);

  const rows = useMemo(() => {
    const now = asOfMs;
    return data.subscriptions
      .map((s) => {
        const txn = data.transactions.find((t) => String(t.subscription_id || "") === s.id);
        const effectiveStatus =
          txn?.status === "refunded"
            ? "refunded"
            : s.status === "refunded"
              ? "refunded"
              : new Date(s.expires_at).getTime() < now
                ? "expired"
                : "active";
        return { ...s, effectiveStatus, txn };
      })
      .filter((r) => filter === "all" || r.effectiveStatus === filter)
      .sort((a, b) => {
        const at = new Date(a.created_at || 0).getTime();
        const bt = new Date(b.created_at || 0).getTime();
        return bt - at;
      });
  }, [data.subscriptions, data.transactions, filter, asOfMs]);

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-4 px-3 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">Subscription Timeline</h1>
            <p className="text-sm text-gray-500 mt-1 leading-snug">
              All plan activations, upgrades, renewals and refunds.
            </p>
          </div>
          <Link
            href="/account"
            className="shrink-0 w-full sm:w-auto text-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            Back to Account
          </Link>
        </div>

        <div className="mt-4 -mx-1 px-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <div className="flex flex-nowrap gap-2 min-w-min sm:flex-wrap">
            {(["all", "active", "expired", "refunded"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold border ${
                  filter === f
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">No records for this filter</p>
          <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
            Try &quot;All&quot; or another filter. New payments and plans appear here after they are recorded.
          </p>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--foreground)]">{r.plan_name_snapshot || "Subscription"}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  <span className="block sm:inline">Created: {formatDate(r.created_at)}</span>
                  <span className="hidden sm:inline"> | </span>
                  <span className="block sm:inline">
                    Validity: {formatDate(r.starts_at)} – {formatDate(r.expires_at)}
                  </span>
                </p>
              </div>
              <span
                className={`self-start rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                  r.effectiveStatus === "active"
                    ? "bg-green-100 text-green-700"
                    : r.effectiveStatus === "refunded"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {r.effectiveStatus}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-gray-600">
              <p>
                Amount:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {r.txn?.currency || r.currency_snapshot || "INR"} {Number(r.txn?.amount ?? r.price_snapshot ?? 0).toLocaleString("en-IN")}
                </span>
              </p>
              <p>
                Payment mode: <span className="font-medium text-[var(--foreground)]">{r.txn?.payment_mode || "—"}</span>
              </p>
              <p>
                Transaction ID: <span className="font-medium text-[var(--foreground)]">{r.txn?.external_txn_id || "—"}</span>
              </p>
              <p>
                Payment date: <span className="font-medium text-[var(--foreground)]">{formatDate(r.txn?.paid_at || r.txn?.created_at)}</span>
              </p>
              <p className="sm:col-span-2">
                Payer source: <span className="font-medium text-[var(--foreground)]">{r.txn?.payer_source || "—"}</span>
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
