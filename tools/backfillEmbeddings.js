import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function backfillEmbeddings() {
  const { data: chats, error } = await supabase
    .from('chats')
    .select('id, content')
    .is('embedding', null)
    .eq('role', 'user')
    .limit(500); // adjust if needed

  if (error) throw error;
  if (!chats.length) {
    console.log('All chats already embedded.');
    return;
  }

  for (const chat of chats) {
    try {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chat.content,
      });

      const embedding = embeddingRes.data[0].embedding;

      const { error: updateError } = await supabase
        .from('chats')
        .update({ embedding })
        .eq('id', chat.id);

      if (updateError) console.error(`Error updating chat ${chat.id}`, updateError);
      else console.log(`✅ Embedded chat ${chat.id}`);
    } catch (err) {
      console.error(`Error embedding chat ${chat.id}`, err);
    }
  }
}

backfillEmbeddings();
