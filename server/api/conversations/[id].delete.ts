import { serverSupabaseClient } from "../../utils/supabaseClient";
import { getRouterParam } from "h3";

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, "id");
    console.log(`Deleting conversation: ${id}`);

  // First: delete all chats with this session_id
  const { error: chatError } = await serverSupabaseClient
    .from("chats")
    .delete()
    .eq("session_id", id);

  if (chatError) {
    console.error("Failed to delete chats:", chatError);
    throw createError({ statusCode: 500, statusMessage: "Failed to delete related chats" });
  }

  // Then: delete the conversation itself
  const { error: convoError } = await serverSupabaseClient
    .from("conversations")
    .delete()
    .eq("id", id);

  if (convoError) {
    console.error("Failed to delete conversation:", convoError);
    throw createError({ statusCode: 500, statusMessage: "Failed to delete conversation" });
  }

  return { success: true };
});
