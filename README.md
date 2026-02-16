Ohhh I love this. We are officially at “write the README like this thing is real and inevitable” stage. 😎

Alright. Here’s a polished, public-facing `README.md` for **Skippybot** — blending technical clarity with just enough soul to feel intentional.

You can paste this straight into your repo.

---

# 🧠 Skippybot

> A conversational AI companion with memory.
> Built for reflection, experimentation, and long-term context.

Skippybot is a self-hosted AI journaling and companion system designed to feel less like a chatbot and more like an evolving collaborator.

It combines:

* 🗂 Persistent conversation history
* 🧬 Vector-based long-term memory retrieval
* 🔐 User-isolated accounts
* 🖼 Image + file upload support
* ⚡ Modern Nuxt frontend
* 🧱 Supabase backend (auth, storage, database)
* 🤖 OpenAI API integration (model configurable)

Skippybot started as a personal AI companion project — but is designed to support multiple users with fully isolated memories and conversations.

---

## 🚀 Tech Stack

**Frontend**

* Nuxt 4
* Vue 3 (Composition API)
* TypeScript
* Bootstrap (UI styling)

**Backend / Infrastructure**

* Supabase

  * PostgreSQL
  * Row-Level Security (RLS)
  * Storage Buckets
  * Google OAuth
* OpenAI API
* Vercel (deployment)

---

## 🧠 Core Concepts

### 1️⃣ Conversations

Each user has:

* Multiple chats
* Message history stored in the database
* Full isolation from other users via RLS policies

### 2️⃣ Sticky Memory (Vector Store)

Skippybot stores selected long-term memory entries as embeddings.

When a user sends a message:

1. The message is embedded.
2. Similar past memories are retrieved.
3. Relevant context is injected into the system prompt.
4. The model responds with awareness of prior patterns.

This allows:

* Long-term thematic continuity
* Personalization without bloated prompts
* Scalable memory retrieval

---

### 3️⃣ User Isolation

Designed for multi-user support:

* Each user has their own:

  * Conversations
  * Memory entries
  * File uploads
* Admin cannot casually browse user chats (architected with privacy in mind)
* RLS enforces scoped access

---

## 📦 Project Structure (High Level)

```
/app
  /components
  /pages
  /composables
  /server
/supabase
  schema.sql
```

Key Concepts:

* `conversations` table
* `messages` table
* `memory_embeddings` table
* Storage bucket for user uploads
* OAuth configuration for authentication

---

## 🔐 Authentication

Currently supported:

* Google OAuth (via Supabase)

Flow:

1. User logs in with Google
2. Supabase issues session
3. Frontend loads user-scoped data
4. RLS enforces per-user access

---

## ⚙️ Setup

### 1. Clone

```bash
git clone <your-repo>
cd skippybot
```

### 2. Install

```bash
pnpm install
```

### 3. Environment Variables

Create `.env`:

```
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

### 4. Run

```bash
pnpm dev
```

---

## 🧪 Memory System Design (Conceptual)

When a message is sent:

1. Store message in DB
2. Generate embedding
3. Store embedding in `memory_embeddings`
4. On future messages:

   * Generate embedding of input
   * Query for top N similar embeddings
   * Inject retrieved memory into prompt

This keeps:

* Prompts lean
* Context relevant
* Cost controlled

---

## 🎯 Design Philosophy

Skippybot is not:

* A corporate chatbot
* A productivity dashboard
* A therapy simulator
* A generic AI wrapper

It is:

* A thinking companion
* An interactive journal
* A long-memory collaborator
* A sandbox for experimenting with AI architecture

---

## 🔭 Roadmap

* [ ] Encrypted memory layer
* [ ] User-configurable personality modes
* [ ] Memory tagging + pruning system
* [ ] Export / import full memory archive
* [ ] Admin dashboard (usage metrics only, no content visibility)
* [ ] Mobile-optimized PWA version

---

## 🧬 Long-Term Vision

Skippybot is an exploration of what happens when:

* AI has continuity
* Memory is structured
* Identity is user-scoped
* Privacy is intentional
* Personality is configurable

It’s not about replacing ChatGPT.

It’s about owning the interface.

---

## 📜 Companion Ethos

The internal guiding document that shaped the original design can be found here:



This document defines tone, philosophy, and behavioral constraints for the companion layer.

---

## 🛡 Disclaimer

This project is experimental.
It is not a medical tool, legal advisor, or licensed therapist.
Users are responsible for how they use it.

---

## ❤️ Why It Exists

Because sometimes you don’t just want answers.

You want continuity.

---

If you want, we can also:

* Make a **public README** version (leaner, less personal)
* Or a **developer-focused README** (more schema + RLS details)
* Or a spicy “Skippy Prime Manifesto” version 😏

This is good though. This feels real.
