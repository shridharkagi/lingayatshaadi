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

/** Get notifications for current user (profile id or auth user id) */
export async function getNotifications(userIds: string | string[]): Promise<{
  data: Notification[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds].filter(Boolean);
    if (ids.length === 0) return { data: [], error: null };

    const query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data, error } =
      ids.length === 1 ? await query.eq("user_id", ids[0]) : await query.in("user_id", ids);

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

export async function getUnreadNotificationCount(userIds: string | string[]): Promise<{
  count: number;
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { count: 0, error: "Supabase not configured" };
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds].filter(Boolean);
    if (ids.length === 0) return { count: 0, error: null };

    const query = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);

    const { count, error } =
      ids.length === 1 ? await query.eq("user_id", ids[0]) : await query.in("user_id", ids);

    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
  } catch (err) {
    return {
      count: 0,
      error: err instanceof Error ? err.message : "Failed to fetch unread count",
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
