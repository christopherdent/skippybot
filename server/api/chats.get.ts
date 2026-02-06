// server/api/chats.get.ts
import { supabase } from "../utils/supabaseClient";

export default defineEventHandler(async (event) => {
  const { conversationId } = getQuery(event);

  if (!conversationId) {
    return { chats: [] };
  }

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("session_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chats:", error);
    return { chats: [] };
  }

  return { chats: data };
});
