// server/api/conversations.get.ts
import { supabase } from "../utils/supabaseClient";

export default defineEventHandler(async () => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return { conversations: [] };
  }

  return { conversations: data };
});
