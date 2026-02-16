-- Selective memory storage (ChatGPT-style)
-- Run this in Supabase SQL editor.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_chat_id bigint null references public.chats(id) on delete set null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_id_created_at_idx
  on public.memories (user_id, created_at desc);

create index if not exists memories_embedding_idx
  on public.memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop function if exists public.match_memories(vector(1536), float, int, uuid);
drop function if exists public.match_memories(vector, float, int, uuid);

create function public.match_memories(
  query_embedding vector(1536),
  match_threshold float default 0.78,
  match_count int default 6,
  filter_user_id uuid default null
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
as $$
  select
    m.id,
    m.content,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where
    (filter_user_id is null or m.user_id = filter_user_id)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
