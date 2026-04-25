"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, FileText } from "lucide-react";
import { createSupabaseClientSafe } from "@/lib/supabase";
import { compressAndConvertToWebP } from "@/lib/imageCompression";

type KycDoc = {
  id: string;
  id_type: string;
  file_type: string;
  file_name: string;
  url: string;
  signed_url?: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  created_at: string;
};

const ID_TYPES = [
  { value: "aadhar", label: "Aadhar" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan", label: "PAN" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "other", label: "Other Govt ID" },
];

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createSupabaseClientSafe();
  if (!supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export function KycDocumentsUpload({
  profileId,
  userId,
  adminMode = false,
}: {
  profileId?: string;
  userId: string;
  adminMode?: boolean;
}) {
  const [idType, setIdType] = useState("aadhar");
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [canUserEdit, setCanUserEdit] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profileId) return;
    const headers = await getAuthHeader();
    const res = await fetch(`/api/kyc-documents?profileId=${profileId}`, { headers, cache: "no-store" });
    const json = (await res.json()) as {
      documents?: KycDoc[];
      can_user_edit?: boolean;
      error?: string;
    };
    if (!res.ok) {
      setError(json.error || "Failed to load documents");
      return;
    }
    setDocs(json.documents || []);
    setCanUserEdit(json.can_user_edit ?? true);
  };

  useEffect(() => {
    if (profileId) void load();
  }, [profileId]);

  const onUpload = async (file: File) => {
    if (!profileId) {
      setError("Save profile first, then upload KYC documents.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      let toUpload = file;
      if (file.type.startsWith("image/")) {
        toUpload = await compressAndConvertToWebP(file);
      }
      const form = new FormData();
      form.append("file", toUpload);
      form.append("userId", userId);
      const uploadRes = await fetch("/api/upload-kyc-document", { method: "POST", body: form });
      const uploadJson = (await uploadRes.json()) as {
        storagePath?: string;
        fileType?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadJson.storagePath) {
        throw new Error(uploadJson.error || "Upload failed");
      }
      const headers = await getAuthHeader();
      const saveRes = await fetch("/api/kyc-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          profileId,
          idType,
          fileType: uploadJson.fileType || toUpload.type || file.type,
          fileName: file.name,
          url: "",
          storagePath: uploadJson.storagePath,
        }),
      });
      const saveJson = (await saveRes.json()) as { error?: string };
      if (!saveRes.ok) throw new Error(saveJson.error || "Failed to save metadata");
      setInfo("Document uploaded. You can replace or delete it before approval.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!adminMode && !canUserEdit) return;
    const ok = window.confirm("Delete this KYC document?");
    if (!ok) return;
    const headers = await getAuthHeader();
    const res = await fetch(`/api/kyc-documents/${id}`, { method: "DELETE", headers });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Delete failed");
      return;
    }
    await load();
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    const rejectionReason =
      status === "rejected" ? window.prompt("Rejection reason", "Document unclear") || "" : undefined;
    const headers = await getAuthHeader();
    const res = await fetch(`/api/kyc-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ status, rejectionReason }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Review update failed");
      return;
    }
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        KYC document upload.
        {adminMode
          ? " As admin, you can approve/reject/delete and re-upload as needed."
          : canUserEdit
          ? " Once you submit an ID, it will be locked. You can upload only before submission lock."
          : " Document submitted and locked. Contact admin for any changes."}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          {ID_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading || (!adminMode && !canUserEdit)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload size={16} />
          {loading ? "Uploading..." : "Upload ID"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onUpload(file);
        }}
      />

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize">{d.id_type.replace("_", " ")}</p>
              <a href={d.signed_url || d.url} target="_blank" className="text-xs text-[var(--primary)] hover:underline" rel="noreferrer">
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} /> {d.file_name}
                </span>
              </a>
              <p className="text-xs text-gray-500">Status: {d.status}</p>
              {d.status === "rejected" && d.rejection_reason && (
                <p className="text-xs text-red-600">{d.rejection_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {adminMode && (
                <>
                  <button
                    onClick={() => void review(d.id, "approved")}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void review(d.id, "rejected")}
                    className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              {(adminMode || canUserEdit) && (
                <button
                  onClick={() => void remove(d.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <p className="text-sm text-gray-500">No KYC documents uploaded yet.</p>
        )}
      </div>
      {info && <p className="text-xs text-emerald-700">{info}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
