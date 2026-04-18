import { createSupabaseClientSafe } from "@/lib/supabase";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read ?? false,
    createdAt: row.created_at,
  };
}

/** Get notifications for current user (profile id) */
export async function getNotifications(myProfileId: string): Promise<{
  data: Notification[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", myProfileId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => toNotification(r as NotificationRow)),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch notifications",
    };
  }
}

/** Mark notification as read */
export async function markNotificationRead(notificationId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to mark as read",
    };
  }
}
