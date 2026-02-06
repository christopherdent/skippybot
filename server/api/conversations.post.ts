// server/api/conversations.post.ts
import { supabase } from "../utils/supabaseClient";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const title = (body?.title || "").trim();

  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || null })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to create conversation" });
  }

  return { conversation: data };
});
