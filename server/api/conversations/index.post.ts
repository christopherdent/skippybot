import { serverSupabaseClient } from "../../utils/supabaseClient";



export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const title = body?.title?.trim() || null;  // Use null instead of "Untitled Chat"

  const { data, error } = await serverSupabaseClient
    .from("conversations")
    .insert({ title })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to create conversation" });
  }

  return { conversation: data };
});