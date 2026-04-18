import { createSupabaseClientSafe } from "@/lib/supabase";

async function createNotificationForUser(
  userId: string,
  type: string,
  title: string,
  message: string
) {
  try {
    await fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type, title, message }),
    });
  } catch {
    // ignore
  }
}
import type { Interest } from "@/types";

type InterestRow = {
  id: string;
  from_id: string;
  to_id: string;
  message: string | null;
  status: string;
  created_at: string;
};

function toInterest(row: InterestRow): Interest {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    message: row.message ?? undefined,
    status: row.status as Interest["status"],
    createdAt: row.created_at,
  };
}

/** Get interests received by a profile */
export async function getReceivedInterests(myProfileId: string): Promise<{
  data: Array<Interest & { fromProfileId: string }>;
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("interests")
      .select("*")
      .eq("to_id", myProfileId)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => ({
        ...toInterest(r as InterestRow),
        fromProfileId: (r as InterestRow).from_id,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch interests",
    };
  }
}

/** Send an interest */
export async function sendInterest(
  fromProfileId: string,
  toProfileId: string,
  message?: string,
  fromName?: string
): Promise<{ data: Interest | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("interests")
      .insert({
        from_id: fromProfileId,
        to_id: toProfileId,
        message: message?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    const who = fromName?.trim() || "Someone";
    createNotificationForUser(toProfileId, "interest_received", "New Interest", `${who} sent you an interest`);

    return { data: toInterest(data as InterestRow), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to send interest",
    };
  }
}

/** Accept an interest */
export async function acceptInterest(
  interestId: string,
  options?: { fromProfileId?: string; accepterName?: string }
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { data: interest } = await supabase
      .from("interests")
      .select("from_id")
      .eq("id", interestId)
      .single();

    const { error } = await supabase
      .from("interests")
      .update({ status: "accepted" })
      .eq("id", interestId);

    if (error) return { error: error.message };

    if (interest?.from_id) {
      const name = options?.accepterName || "Someone";
      createNotificationForUser(
        interest.from_id,
        "interest_accepted",
        "Interest Accepted",
        `${name} accepted your interest`
      );
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to accept interest",
    };
  }
}

/** Decline an interest */
export async function declineInterest(interestId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("interests")
      .update({ status: "declined" })
      .eq("id", interestId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to decline interest",
    };
  }
}

/** Check if there's an accepted interest between two profiles (either direction) */
export async function hasAcceptedInterest(
  profileIdA: string,
  profileIdB: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: false, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("interests")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(from_id.eq.${profileIdA},to_id.eq.${profileIdB}),and(from_id.eq.${profileIdB},to_id.eq.${profileIdA})`
      )
      .maybeSingle();

    if (error) return { data: false, error: error.message };
    return { data: !!data, error: null };
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err.message : "Failed to check interest",
    };
  }
}

/** Check if current user has sent interest to a profile */
export async function hasSentInterest(
  fromProfileId: string,
  toProfileId: string
): Promise<{ data: Interest | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("interests")
      .select("*")
      .eq("from_id", fromProfileId)
      .eq("to_id", toProfileId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return {
      data: data ? toInterest(data as InterestRow) : null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to check interest",
    };
  }
}
