import { createSupabaseClientSafe } from "@/lib/supabase";
import type { Message } from "@/types";

export function getConversationId(profileIdA: string, profileIdB: string): string {
  return [profileIdA, profileIdB].sort().join("_");
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    read: row.read ?? false,
    createdAt: row.created_at,
  };
}

/** Get conversations for current user (profile id) with last message and unread count */
export async function getConversations(myProfileId: string): Promise<{
  data: Array<{
    otherProfileId: string;
    lastMessage: Message;
    unreadCount: number;
  }>;
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${myProfileId},receiver_id.eq.${myProfileId}`)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };

    const byConversation = new Map<
      string,
      { lastMessage: Message; unreadCount: number }
    >();
    for (const row of (messages || []) as MessageRow[]) {
      const convId = row.conversation_id;
      const otherId =
        row.sender_id === myProfileId ? row.receiver_id : row.sender_id;
      const key = otherId;
      if (!byConversation.has(key)) {
        const msg = toMessage(row);
        const unread =
          row.receiver_id === myProfileId && !row.read ? 1 : 0;
        byConversation.set(key, { lastMessage: msg, unreadCount: unread });
      } else {
        const cur = byConversation.get(key)!;
        if (row.receiver_id === myProfileId && !row.read) {
          cur.unreadCount += 1;
        }
      }
    }

    const result = Array.from(byConversation.entries()).map(
      ([otherProfileId, { lastMessage, unreadCount }]) => ({
        otherProfileId,
        lastMessage,
        unreadCount,
      })
    );
    return { data: result, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch conversations",
    };
  }
}

/** Subscribe to new messages in a conversation (real-time) */
export function subscribeToNewMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const supabase = createSupabaseClientSafe();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as MessageRow;
        onNewMessage(toMessage(row));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Get messages in a conversation */
export async function getMessages(
  myProfileId: string,
  otherProfileId: string
): Promise<{ data: Message[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const convId = getConversationId(myProfileId, otherProfileId);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => toMessage(r as MessageRow)),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch messages",
    };
  }
}

/** Send a message */
export async function sendMessage(
  senderProfileId: string,
  receiverProfileId: string,
  content: string
): Promise<{ data: Message | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const convId = getConversationId(senderProfileId, receiverProfileId);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id: senderProfileId,
        receiver_id: receiverProfileId,
        content: content.trim(),
        read: false,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    createNotificationForReceiver(
      receiverProfileId,
      "new_message",
      "New Message",
      "You have a new message"
    );

    return { data: toMessage(data as MessageRow), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to send message",
    };
  }
}

async function createNotificationForReceiver(
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
