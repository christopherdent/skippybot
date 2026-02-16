// server/api/conversations.get.ts
import { requireUser } from "../../utils/requireUser";

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event);

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return { conversations: [] };
  }

  return { conversations: data };
});
