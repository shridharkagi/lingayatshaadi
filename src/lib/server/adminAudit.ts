import { createSupabaseAdmin } from "@/lib/supabase";

export type AdminAuditAction =
  | "profile.approve"
  | "profile.reject"
  | "photo.approve"
  | "photo.reject"
  | "profile.suspend"
  | "profile.unsuspend"
  | "profile.move_to_draft"
  | "profile.trash"
  | "profile_deletion_request.approve"
  | "profile_deletion_request.reject"
  | "profile.restore"
  | "profile.purge"
  | "subscription.assign_manual"
  | "subscription.adjust_manual"
  | "subscription.refund_manual"
  | "subscription.upgrade_request_status"
  | "subscription.plan_update";

export async function logAdminAudit(params: {
  actorUserId: string;
  action: AdminAuditAction;
  entityType: string;
  entityId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("admin_audit_logs").insert({
      actor_user_id: params.actorUserId,
      action_type: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      before_json: params.beforeJson ?? null,
      after_json: params.afterJson ?? null,
      meta: params.meta ?? null,
    });
  } catch {
    // Keep admin actions non-blocking even if logging fails.
  }
}
