// importConversations.js

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const conversations = JSON.parse(fs.readFileSync('./conversations.json', 'utf8'));

async function insertConversation(convoId, title, createdAt, updatedAt) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify([{
      id: convoId,
      title: title || '(Untitled)',
      created_at: new Date(createdAt * 1000).toISOString(),
      updated_at: new Date(updatedAt * 1000).toISOString()
    }])
  });
  return res.ok;
}

async function insertChatMessage(sessionId, role, content, timestamp) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/chats`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      id: uuidv4(),
      session_id: sessionId,
      role,
      content,
      created_at: new Date(timestamp * 1000).toISOString()
    }])
  });
  return res.ok;
}

async function runImport() {
  for (const convo of conversations) {
    const { conversation_id, title, mapping, create_time, update_time } = convo;

    console.log(`Importing: ${title || '(Untitled)'} - ${conversation_id}`);

    await insertConversation(conversation_id, title, create_time, update_time || create_time);

    const sortedNodes = Object.values(mapping)
      .filter(n => n.message && n.message.content?.parts?.[0])
      .sort((a, b) => (a.message.create_time || 0) - (b.message.create_time || 0));

    for (const node of sortedNodes) {
      const { role, content, create_time } = node.message;
      const text = content.parts[0];

      if (role && text) {
        await insertChatMessage(conversation_id, role, text, create_time);
      }
    }
  }

  console.log('✅ Import complete.');
}

runImport().catch(console.error);
