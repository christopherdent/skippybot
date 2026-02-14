import { requireUser } from "../../utils/requireUser";



export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event);
  const body = await readBody(event);
  const title = body?.title?.trim() || null;  // Use null instead of "Untitled Chat"

  const { data, error } = await supabase
    .from("conversations")
    .insert({ title, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to create conversation" });
  }

  return { conversation: data };
});
