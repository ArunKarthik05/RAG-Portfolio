# RAG Portfolio — Frontend

A Next.js 14 AI-powered portfolio application for **Arun Karthik**. Visitors can ask natural-language questions about Arun's background, skills, and projects. The app streams answers from a FastAPI RAG backend (hybrid pgvector + FTS retrieval, GPT-4o) with inline source citations, conversation history, semantic caching, follow-up suggestions, and a public testimonials system.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Components](#components)
- [State Management](#state-management)
- [Authentication](#authentication)
- [API Communication](#api-communication)
- [Streaming (SSE)](#streaming-sse)
- [Conversation Threading](#conversation-threading)
- [Semantic Cache Awareness](#semantic-cache-awareness)
- [Testimonials System](#testimonials-system)
- [Theming & Design](#theming--design)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline style objects for dynamic values |
| Auth | NextAuth v4 (Google OAuth + GitHub OAuth) |
| Streaming | Native `EventSource` / fetch + ReadableStream (SSE) |
| Markdown | `react-markdown` + `remark-gfm` |
| Icons | `lucide-react` |
| Animations | `framer-motion` |
| HTTP client | Native `fetch` |

---

## Architecture Overview

```
Browser
  │
  ├── Next.js App Router (port 3000)
  │     ├── /                  → Main chat UI
  │     ├── /testimonials      → Public testimonials page
  │     ├── /proof/[id]        → Citation verification page
  │     ├── /admin             → GitHub ingestion admin panel
  │     └── /api/auth/[...nextauth] → NextAuth OAuth handlers
  │
  └── FastAPI Backend (port 8000, via NEXT_PUBLIC_API_URL)
        ├── POST /chat/stream         → SSE streaming RAG answer
        ├── GET  /conversations/      → Fetch user conversations
        ├── POST /conversations/      → Create conversation
        ├── GET  /conversations/{id}/messages
        ├── POST /conversations/{id}/messages
        ├── GET  /testimonials/
        ├── POST /testimonials/
        ├── PUT  /testimonials/{id}
        └── DELETE /testimonials/{id}
```

The frontend never calls OpenAI directly. All AI inference, retrieval, and caching happens in the FastAPI backend. The frontend's job is to render streaming SSE events, manage conversation state, and persist messages after each turn.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css                  # Full light-theme CSS (cream + orange palette)
│   │   ├── layout.tsx                   # Root layout: fonts, metadata, SessionProvider
│   │   ├── page.tsx                     # Main chat page (home)
│   │   ├── admin/
│   │   │   └── page.tsx                 # GitHub ingestion admin panel
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   │   └── route.ts             # NextAuth route handler
│   │   │   └── admin/
│   │   │       ├── github/route.ts      # List GitHub repos (server-side, uses ADMIN_API_KEY)
│   │   │       └── github/[repo]/route.ts  # Per-repo ingest/delete actions
│   │   ├── ingest/[source]/
│   │   │   └── route.ts                 # Ingestion proxy route
│   │   ├── proof/[id]/
│   │   │   └── page.tsx                 # Proof record viewer (SSR)
│   │   └── testimonials/
│   │       └── page.tsx                 # Testimonials page (CSR)
│   │
│   ├── components/
│   │   ├── AuthModal.tsx                # OAuth / guest auth modal
│   │   ├── AvatarHero.tsx               # Animated hero avatar shown in empty chat state
│   │   ├── Background3D.tsx             # (Legacy) 3D background — not used in main layout
│   │   ├── ChatInterface.tsx            # Core chat UI: streaming, history, suggestions
│   │   ├── CitationDrawer.tsx           # Slide-in drawer showing citation details
│   │   ├── ConversationSidebar.tsx      # Collapsible conversation history sidebar
│   │   ├── OrbitBall.tsx                # 3D orbit animation (used in AvatarHero)
│   │   ├── References.tsx               # Citation pills rendered below messages
│   │   ├── SessionProvider.tsx          # Client wrapper for NextAuth SessionProvider
│   │   └── SourcePanel.tsx              # (Legacy) Source filter panel — removed from UI
│   │
│   └── lib/
│       ├── api.ts                       # Shared TypeScript types + fetch helpers
│       └── utils.ts                     # cn() helper (clsx + tailwind-merge)
│
├── public/
│   ├── arun-avatar.png                  # Avatar used in AvatarHero
│   └── arun-testimonials.png            # Avatar used in testimonials hero
│
├── .env.local                           # Local secrets (not committed in production)
├── next.config.mjs                      # Minimal Next.js config + security headers
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Pages & Routes

### `/` — Main Chat Page (`app/page.tsx`)

The root client component. Responsibilities:

- Reads NextAuth session via `useSession()`. Shows an orange spinner while auth state is loading.
- Shows `<AuthModal>` when unauthenticated and user has not chosen guest mode.
- Renders a sticky header with: brand (Sparkles icon + name), a center orange "Testimonials" pill linking to `/testimonials`, social links (GitHub, LinkedIn, Email), and user avatar + sign-out when logged in.
- Body is a two-column flex layout: `<ConversationSidebar>` on the left (hidden for guests), `<ChatInterface>` filling the right.
- Manages `activeConversationId` (which conversation is open), `chatKey` (forces full `ChatInterface` remount on "New conversation"), `sidebarRefresh` counter (triggers sidebar re-fetch after a message is saved), and `isGuest` flag.
- `createConversation()` is a memoised callback that hits `POST /conversations/` and returns the new conversation ID; it's passed down to `ChatInterface` so the first message can create a conversation before saving.

### `/testimonials` — Testimonials Page (`app/testimonials/page.tsx`)

Fully client-rendered. Layout:

- **Header**: identical to the main page header, but the center pill reads "Back to Chat" (links to `/`).
- **Hero section**: two-column grid. Left side: avatar photo with orange ring + ShieldCheck badge, headline, description, stat pills (testimonial count, "Always Learning & Growing", "Real"). Right side: the submission form card.
- **Form**: name, role, company, message, and a tag picker ("What qualities did you love most about Arun?"). Tags are selected from 12 predefined suggestions or typed as custom. Maximum 3 tags. No star ratings.
- **Testimonials grid**: a styled container with a decorative orange top strip, section header, and a 1/2/3 column responsive grid of testimonial cards.
- **Testimonial cards**: show quote, message text, tags as orange pills, author initials avatar, role/company, date. Edit (pencil) and delete (trash) icon buttons appear on hover only for the currently signed-in user's own cards. Edit mode replaces the card with an inline form.

### `/proof/[id]` — Proof Viewer (`app/proof/[id]/page.tsx`)

Server-rendered. Fetches a `ProofRecord` by ID from the backend. Displays the original question, the full answer, the model used, token counts, and all citations with source type badges. Useful for verifying that an answer is grounded in real sources.

### `/admin` — Admin Panel (`app/admin/page.tsx`)

Client-rendered, password-gated (compares against `NEXT_PUBLIC_ADMIN_PASSWORD`). Lists the owner's GitHub repos via a server-side API route (which uses `ADMIN_API_KEY` to call the backend). Allows selecting repos to ingest into the RAG backend, viewing indexing status, and triggering re-ingestion.

---

## Components

### `ChatInterface.tsx`

The most complex component. Manages the entire chat experience.

**Props:**
```typescript
interface ChatInterfaceProps {
  sourceFilter?: SourceFilter;             // { source_types, repo_filter } — scopes RAG retrieval
  userId?: string | null;                  // Signed-in user email; null for guests
  isGuest?: boolean;
  onRequestSignIn?: () => void;            // Re-open AuthModal
  activeConversationId?: string | null;    // Set from sidebar to load a past conversation
  onConversationCreated?: (id: string) => void;
  createConversation?: () => Promise<string | null>;
  onSidebarRefresh?: () => void;           // Called after saving the first message to trigger sidebar update
}
```

**Internal Message shape:**
```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  proofId?: string;
  citations?: CitationChunk[];
  suggestions?: string[];      // 3 follow-up question strings generated by the backend
  fromCache?: boolean;         // True when answer served from semantic cache
  streaming?: boolean;         // True while SSE is still arriving
}
```

**Key behaviours:**
- Empty state: shows `<AvatarHero>` + 4 suggested prompt chips. Clicking a chip populates the input.
- On submit: appends a user message, creates a conversation if needed, opens an SSE connection to `POST /chat/stream`, streams content into an assistant message, then parses the final `event: proof` frame to attach `proofId`, `citations`, `suggestions`, and `fromCache`.
- Conversation loading: when `activeConversationId` changes, fetches message history from `GET /conversations/{id}/messages` and replays it. Shows an orange spinner during load (`convLoading` state) instead of the empty-state hero.
- Message limit: enforced at 10 messages per conversation (5 turns). Shows a "Conversation limit reached" banner after.
- Cache badge: when `fromCache === true`, a green ⚡ "Cached" badge appears on the assistant message.
- Suggestion chips: rendered below the last assistant message. Clicking one sets it as the next input value.

### `ConversationSidebar.tsx`

Collapsible sidebar. 240px wide when open, 48px when collapsed. Hidden entirely for guests.

**Props:**
```typescript
interface Props {
  userId: string | null;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshTrigger?: number;  // Increment this to trigger a re-fetch
}
```

Fetches from `GET /conversations/?user_id={userId}` on mount and whenever `userId`, `activeConversationId`, or `refreshTrigger` changes. Supports deleting conversations via `DELETE /conversations/{id}`. Active conversation is highlighted in orange.

### `AuthModal.tsx`

Fixed bottom-right modal (320px wide). Appears when `open === true`. Offers:
- Google OAuth (via NextAuth `signIn("google")`)
- GitHub OAuth (via NextAuth `signIn("github")`)
- "Continue as Guest" button (calls `onGuest`)

Dismissible via backdrop click or Escape key. Light theme: white background, `#fff2ec` Google button.

### `References.tsx`

Renders citation pills below an assistant message. Each pill shows a coloured source-type badge (colour defined in `lib/api.ts` → `SOURCE_META`) and the source title. Clicking opens the `<CitationDrawer>`.

### `CitationDrawer.tsx`

Slide-in from the right. Shows full citation details: source type, title, URL, similarity score, chunk text excerpt, and date indexed.

### `AvatarHero.tsx`

Shown in the empty chat state. Animated avatar with orange glow ring, a speech bubble with a greeting, and a pulsing orbit animation.

---

## State Management

No external state library. All state is local React (`useState`, `useCallback`, `useEffect`) with prop drilling between `page.tsx` and its children. Key patterns:

- **`chatKey` counter**: incrementing this forces a full remount of `<ChatInterface>`, cleanly resetting all chat state when "New conversation" is clicked or when switching conversations.
- **`sidebarRefresh` counter**: incremented after the first user message is saved (when the auto-title has been set on the backend), triggering the sidebar to re-fetch and display the new conversation.
- **`activeConversationId`**: set by the sidebar's `onSelect`; causes `ChatInterface` to load history for that conversation.

---

## Authentication

NextAuth v4 is configured in `app/api/auth/[...nextauth]/route.ts` with:
- **Google** provider
- **GitHub** provider

Session strategy is JWT (default). The user's email is used as `userId` throughout — for conversation ownership, for testimonial ownership, and for the admin panel gate.

Guests can use the chat without signing in but their conversations are not persisted (no sidebar, no history).

---

## API Communication

All backend calls use native `fetch`. Base URL comes from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

Key endpoints used:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/chat/stream` | Start SSE streaming RAG answer |
| `GET` | `/conversations/` | List user's conversations |
| `POST` | `/conversations/` | Create a new conversation |
| `DELETE` | `/conversations/{id}` | Delete a conversation |
| `GET` | `/conversations/{id}/messages` | Load message history |
| `POST` | `/conversations/{id}/messages` | Save a message |
| `GET` | `/testimonials/` | List all approved testimonials |
| `POST` | `/testimonials/` | Submit a testimonial |
| `PUT` | `/testimonials/{id}` | Edit own testimonial |
| `DELETE` | `/testimonials/{id}?user_id=` | Delete own testimonial |
| `GET` | `/proof/{id}` | Fetch proof record |

Shared TypeScript types in `src/lib/api.ts`:
```typescript
CitationChunk    // { chunk_id, source_type, source_url, source_title, chunk_text, similarity_score, date_indexed }
ProofRecord      // { proof_id, question, answer, citations, model_used, prompt_tokens, completion_tokens, created_at }
SourceFilter     // { source_types: string[] | null, repo_filter: string[] | null }
GitHubRepo       // { repo_name, source_url, last_indexed }
```

---

## Streaming (SSE)

The chat endpoint returns a Server-Sent Events stream. The frontend connects via `fetch` + `ReadableStream`:

```
POST /chat/stream  { question, source_types, repo_filter, conversation_history }

→ data: "Hello"
→ data: ", here"
→ data: " is my answer"
→ data: [DONE]
→ event: proof
→ data: { "proof_id": "...", "citations": [...], "suggestions": [...], "from_cache": false }
```

The frontend accumulates `data:` lines into the streaming assistant message in real time. On `[DONE]` it marks streaming complete. On the `event: proof` frame it parses the JSON and attaches metadata to the message. This same interface works whether the answer is live from GPT-4o or replayed from the semantic cache.

---

## Conversation Threading

When a signed-in user sends a message:

1. If no conversation exists: `createConversation()` is called → `POST /conversations/` → returns `conversation_id`.
2. User message is saved: `POST /conversations/{id}/messages` with `{ role: "user", content }`.
3. SSE stream runs, assembles full answer.
4. Assistant message is saved: `POST /conversations/{id}/messages` with `{ role: "assistant", content, proof_id }`.
5. `onSidebarRefresh()` is called, incrementing `sidebarRefresh`, causing the sidebar to re-fetch and display the new conversation with its auto-generated title.

The last 10 messages from history are sent as `conversation_history` in each streaming request so GPT-4o maintains context across turns.

---

## Semantic Cache Awareness

The backend maintains a semantic cache (cosine similarity threshold 0.70, 24h TTL, data freshness check). When a cache hit occurs:

- The SSE stream still arrives in the same format (40-char chunks), so the frontend renders identically.
- The `proof` event includes `"from_cache": true`.
- `ChatInterface` detects this and renders a green ⚡ "Cached" badge on the assistant message bubble.

No frontend changes are needed to benefit from the cache — it's transparent.

---

## Testimonials System

The testimonials page supports both signed-in users and guests:

- **Submission**: name, role (optional), company (optional), message (10–1000 chars), up to 3 quality tags.
- **Tags**: 12 predefined suggestions ("Problem Solver", "Team Player", "Fast Learner", etc.) or custom typed. Max 3 selected at once.
- **Ownership**: stored as `user_id` (email) in the backend. Edit/delete controls only appear for the signed-in user's own cards.
- **Edit flow**: clicking pencil on your card replaces the card with an inline form (same fields + tag picker). Calls `PUT /testimonials/{id}` with `user_id` for ownership verification.
- **Delete flow**: calls `DELETE /testimonials/{id}?user_id=...`. Backend verifies ownership before deleting. Optimistically removes from local state on success.
- Guest testimonials (null `user_id`) cannot be edited or deleted.

---

## Theming & Design

The app uses a **warm cream + orange** palette throughout (`globals.css`):

| Token | Value | Usage |
|---|---|---|
| Background | `#f8f5f1` | Page background |
| Surface | `#ffffff` | Cards, modals, header |
| Border | `#ede8e2` | Card borders, dividers |
| Text primary | `#1a1209` | Headlines, body |
| Text secondary | `#6b5c4e` | Labels, subtitles |
| Text muted | `#9e8876` | Timestamps, hints |
| Orange primary | `#e85c2a` | CTAs, active states, icons |
| Orange light | `#f07a50` | Gradient end, hover |
| Orange bg | `#fff2ec` | Hover backgrounds, tag chips |

Orange gradient: `linear-gradient(135deg, #e85c2a, #f07a50)`
Orange glow: `0 0 0 3px rgba(232,92,42,0.15), 0 4px 14px rgba(232,92,42,0.35)`

Dynamic values (that change based on hover/focus state) are applied as inline `style` objects with `onMouseEnter`/`onMouseLeave` handlers rather than Tailwind, to avoid Tailwind's JIT purging dynamic class names.

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Admin panel (client-side password gate)
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password

# Admin API key (used in server-side API routes to call backend)
ADMIN_API_KEY=your_admin_api_key

# NextAuth
NEXTAUTH_SECRET=your_32_char_random_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Required for production:**
- Add your deployed frontend URL to `NEXTAUTH_URL`
- Add the same URL to Google OAuth "Authorised redirect URIs": `https://yourdomain.vercel.app/api/auth/callback/google`
- Add to GitHub OAuth "Callback URL": `https://yourdomain.vercel.app/api/auth/callback/github`
- Point `NEXT_PUBLIC_API_URL` to your deployed backend (e.g. Railway URL)

---

## Local Development

```bash
# From the frontend/ directory
npm install
npm run dev       # Starts on http://localhost:3000
```

The backend must be running at the URL in `NEXT_PUBLIC_API_URL` for chat and testimonials to work. See the `backend/` README for backend setup.

```bash
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint check
```

---

## Deployment

**Recommended: Vercel**

Vercel is the natural host for Next.js. Steps:
1. Push this repo to GitHub.
2. Import the repository in [vercel.com](https://vercel.com) and set the **root directory** to `frontend/`.
3. Add all environment variables from `.env.local` in the Vercel project settings.
4. Set `NEXTAUTH_URL` to your Vercel deployment URL (e.g. `https://rag-portfolio.vercel.app`).
5. Update Google and GitHub OAuth app redirect URIs to the Vercel URL.
6. Every push to `main` triggers an automatic redeploy.

The backend should be deployed separately (Railway recommended) and its public URL set as `NEXT_PUBLIC_API_URL`.
