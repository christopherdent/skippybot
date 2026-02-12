## TODOS

- README
- Sticky memory for primary user.
- Public demo mode (see below)

  Right now history is effectively global:
  - server/api/conversations/index.get.ts:5 returns all conversations.
  - server/api/chats.get.ts:12 reads chats by conversationId without ownership checks.
  - server/api/chat.ts:120 always pulls your archive (personal-research-dump) and server/api/chat.ts:141 does
    memory retrieval across chats.

  So I’d call it medium effort, not hard:

  1. Add a demo/user scope check on conversation + chat routes.
  2. Ensure demo users only see conversations they created.
  3. Disable personal archive/memory injection for demo users (or they can still infer your history).

✔ You approved codex to run node --input-type=module -e "import 'dotenv/config'; import { createClient } ...

• Ran node --input-type=module -e "import 'dotenv/config'; import { createClient } from '@supabase/
  │ process.env.SUPABASE_ANON_KEY); const run=async()=>{ const {data,error}=await
  └ ERR conversations TypeError: fetch failed



  1. Add an owner constant/env.
  - Create OWNER_EMAIL=christopherdent01@gmail.com in server env.

  2. Get the authenticated user in every API route (server-side, not from client input).

  - Compute isOwner = user.email?.toLowerCase() === OWNER_EMAIL.
  3. Add conversation ownership in DB.

  - Add owner_email text not null (or better owner_user_id uuid) to conversations.
  - On create (server/api/conversations/index.post.ts), set owner_email to current user email.
  4. Scope conversation list.
  - In server/api/conversations/index.get.ts, filter by current user owner field.


  - In server/api/chats.get.ts, first verify conversationId belongs to current user.
  - In server/api/conversations/[id].delete.ts, verify ownership before delete.
  - In server/api/uploads.post.ts, verify ownership before issuing signed upload URL.

  6. Gate AI memory for demo users.

  - In server/api/chat.ts, if !isOwner:
      - do not load personal-research-dump
      - do not use global match_chats retrieval unless it’s user-scoped
  - Keep normal behavior for owner.

  7. Optional UI signal.

  - Show a small “Demo mode” badge in app/pages/index.vue when logged-in email is not owner.

  8. Quick manual test matrix.

  - Owner account: existing behavior unchanged.
  - Demo account A: can chat, sees only A’s conversations.
  - Demo account B: cannot see A’s conversations.
  - Demo account: no owner-memory leakage in replies.
  - Delete/upload endpoints reject cross-user conversation IDs.