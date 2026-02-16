// server/api/chats.get.ts
import { serverSupabaseAdminClient } from "../utils/supabaseAdminClient";
import { requireUser } from "../utils/requireUser";

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event);
  const { conversationId } = getQuery(event);

  if (!conversationId) {
    return { chats: [] };
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", String(conversationId))
    .eq("user_id", user.id)
    .maybeSingle();

  if (!convo) {
    return { chats: [] };
  }

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("session_id", String(conversationId))
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chats:", error);
    return { chats: [] };
  }

  const chatIds = (data || []).map((c) => c.id).filter(Boolean)
  if (!chatIds.length) {
    return { chats: data };
  }

  const { data: attachments, error: attachmentError } = await supabase
    .from("chat_attachments")
    .select("*")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: true });

  if (attachmentError) {
    console.error("Error fetching attachments:", attachmentError);
    return { chats: data };
  }

  const attachmentsWithUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signed, error: signedError } = await serverSupabaseAdminClient.storage
        .from(att.storage_bucket || "chat-images")
        .createSignedUrl(att.storage_path, 3600);
      if (signedError) {
        return { ...att, signed_url: null };
      }
      return { ...att, signed_url: signed?.signedUrl || null };
    })
  );

  const byChatId = new Map();
  for (const att of attachmentsWithUrls) {
    if (!byChatId.has(att.chat_id)) byChatId.set(att.chat_id, []);
    byChatId.get(att.chat_id).push(att);
  }

  const chatsWithAttachments = (data || []).map((chat) => ({
    ...chat,
    attachments: byChatId.get(chat.id) || []
  }));

  return { chats: chatsWithAttachments };
});
