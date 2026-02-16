import { requireUser } from "../../utils/requireUser";
import { getRouterParam } from "h3";

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event);

  const id = getRouterParam(event, "id");
    console.log(`Deleting conversation: ${id}`);

  // First: delete all chats with this session_id
  const { error: chatError } = await supabase
    .from("chats")
    .delete()
    .eq("session_id", id)
    .eq("user_id", user.id);

  if (chatError) {
    console.error("Failed to delete chats:", chatError);
    throw createError({ statusCode: 500, statusMessage: "Failed to delete related chats" });
  }

  // Then: delete the conversation itself
  const { error: convoError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (convoError) {
    console.error("Failed to delete conversation:", convoError);
    throw createError({ statusCode: 500, statusMessage: "Failed to delete conversation" });
  }

  return { success: true };
});
