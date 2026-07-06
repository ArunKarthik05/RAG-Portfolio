"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { References } from "./References";
import { AvatarHero } from "./AvatarHero";
import { CitationChunk, SourceFilter } from "@/lib/api";
import { cn } from "@/lib/utils";

// Chat streaming still goes directly to the backend (no user data at stake).
// All conversation persistence (save/load/delete) goes through the
// Next.js proxy at /api/conversations/... which verifies the NextAuth session.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  proofId?: string;
  citations?: CitationChunk[];
  suggestions?: string[];
  fromCache?: boolean;
  streaming?: boolean;
}

function normalizeSources(content: string): string {
  // 1. Strip [[SOURCE N]](any-url) double-bracket wrappers the LLM emits
  let out = content.replace(/\[\[SOURCE (\d+)\]\]\([^)]*\)/g, "[SOURCE $1]");

  // 2. Strip single-bracket file:// wrappers: [SOURCE N](file://...) → [SOURCE N]
  out = out.replace(/\[SOURCE (\d+)\]\(file:\/\/[^)]*\)/g, "[SOURCE $1]");

  // 3. Expand any [SOURCE <anything>] by extracting all digit groups.
  //    Handles: [SOURCE 2, SOURCE 5], [SOURCE 2, 5], [SOURCE 2,5]
  out = out.replace(/\[SOURCE ([^\]]+)\]/g, (_match, inner: string) => {
    const nums = [...inner.matchAll(/\d+/g)].map((m) => m[0]);
    if (nums.length === 0) return _match;
    return nums.map((n) => `[SOURCE ${n}]`).join(" ");
  });

  return out;
}

function linkifySources(content: string, citations: CitationChunk[]): string {
  const normalized = normalizeSources(content);
  return normalized.replace(/\[SOURCE (\d+)\]/g, (_match, num) => {
    const idx = parseInt(num, 10) - 1;
    const url = citations[idx]?.source_url;
    // Use bracket-free link text "SOURCE N" to avoid double-bracket Markdown artifacts.
    // file:// paths are local and un-navigable — treat same as no URL.
    const href = url && !url.startsWith("file://") ? url : "#";
    return `[SOURCE ${num}](${href})`;
  });
}

const SUGGESTED = [
  "What are Arun's top skills?",
  "Tell me about his work experience",
  "What projects has he built?",
  "Is he available for opportunities?",
];

const MAX_TURNS = 10;
const WARN_TURNS = 8;

interface ChatInterfaceProps {
  sourceFilter?: SourceFilter;
  userId?: string | null;
  isGuest?: boolean;
  onRequestSignIn?: () => void;
  activeConversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  createConversation?: () => Promise<string | null>;
  onSidebarRefresh?: () => void;
}

export function ChatInterface({
  sourceFilter,
  userId,
  isGuest,
  onRequestSignIn,
  activeConversationId,
  onConversationCreated,
  createConversation,
  onSidebarRefresh,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const centerInputRef = useRef<HTMLInputElement>(null);

  const turnCount = Math.floor(messages.filter((m) => m.role === "user").length);
  const nearLimit = turnCount >= WARN_TURNS && turnCount < MAX_TURNS;
  const atLimit = turnCount >= MAX_TURNS;

  useEffect(() => {
    if (activeConversationId && activeConversationId !== convId) {
      setConvId(activeConversationId);
      setConvLoading(true);
      fetch(`/api/conversations/${activeConversationId}/messages`)
        .then((r) => r.json())
        .then((rows: Array<{ id: string; role: "user" | "assistant"; content: string; citations: CitationChunk[]; proof_id?: string }>) => {
          setMessages(rows.map((r) => ({
            id: r.id,
            role: r.role,
            content: r.content,
            citations: r.citations ?? [],
            proofId: r.proof_id,
          })));
        })
        .catch(() => {})
        .finally(() => setConvLoading(false));
    } else if (activeConversationId === null && convId !== null) {
      setMessages([]);
      setConvId(null);
    }
  }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function saveMessage(cId: string, role: string, content: string, citations?: CitationChunk[], proofId?: string) {
    if (!userId || !cId) return;
    await fetch(`/api/conversations/${cId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, citations: citations ?? [], proof_id: proofId }),
    }).catch(() => {});
  }

  async function sendMessage(question: string) {
    if (!question.trim() || loading || atLimit) return;

    const history = messages
      .filter((m) => !m.streaming && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    let currentConvId = convId;
    if (userId && !currentConvId && createConversation) {
      currentConvId = await createConversation();
      if (currentConvId) {
        setConvId(currentConvId);
        onConversationCreated?.(currentConvId);
      }
    }

    if (currentConvId) {
      await saveMessage(currentConvId, "user", question);
      onSidebarRefresh?.();
    }

    let finalAnswer = "";
    let finalCitations: CitationChunk[] = [];
    let finalProofId = "";

    try {
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          conversation_history: history,
          ...(sourceFilter?.source_types ? { source_types: sourceFilter.source_types } : {}),
          ...(sourceFilter?.repo_filter ? { repo_filter: sourceFilter.repo_filter } : {}),
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          const raw = line.slice(6);
          let parsed: unknown;
          try { parsed = JSON.parse(raw); } catch { parsed = null; }

          if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).proof_id) {
            const p = parsed as { proof_id: string; citations: CitationChunk[]; suggestions?: string[]; from_cache?: boolean };
            finalCitations = p.citations;
            finalProofId = p.proof_id;
            setMessages((msgs) =>
              msgs.map((m) =>
                m.id === assistantId
                  ? { ...m, proofId: p.proof_id, citations: p.citations, suggestions: p.suggestions ?? [], fromCache: p.from_cache ?? false, streaming: false }
                  : m
              )
            );
          } else {
            const token = typeof parsed === "string" ? parsed : raw;
            finalAnswer += token;
            setMessages((msgs) =>
              msgs.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m
              )
            );
          }
        }
      }
      setMessages((msgs) =>
        msgs.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      if (currentConvId) {
        await saveMessage(currentConvId, "assistant", finalAnswer, finalCitations, finalProofId);
      }
    } catch {
      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full relative">

      {/* Conversation loading */}
      {convLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(232,92,42,0.2)" }} />
            <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: "#e85c2a", borderTopColor: "transparent" }} />
          </div>
          <p className="text-xs" style={{ color: "#9e8876" }}>Loading conversation…</p>
        </div>
      )}

      {/* Empty state */}
      {!hasMessages && !convLoading && (
        <div className="flex-1 flex items-center justify-center overflow-hidden px-4 sm:px-0">

          {/* Left: greeting + input + chips */}
          <div className="flex flex-col items-center justify-center w-full sm:px-10 gap-6 sm:gap-8 animate-fade-in">
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#9e8876" }}>
                AI Portfolio
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-snug" style={{ color: "#1a1209" }}>
                Hi there! 👋
              </h2>
              <h2
                className="text-2xl sm:text-3xl font-bold leading-snug"
                style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                I am ready to help you.
              </h2>
              <p className="text-sm mt-2" style={{ color: "#6b5c4e" }}>
                Ask me anything about Arun&apos;s skills, projects &amp; experience.
              </p>
            </div>

            {/* Input card */}
            <div className="w-full max-w-xl">
              <div
                className="rounded-2xl px-4 sm:px-5 py-4 flex flex-col gap-3"
                style={{ background: "#ffffff", border: "1px solid #ede8e2", boxShadow: "0 2px 12px rgba(232,92,42,0.06)" }}
              >
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                  className="flex items-center gap-3"
                >
                  <input
                    ref={centerInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question…"
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-40"
                    style={{ color: "#1a1209" }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all duration-200 hover:scale-105 shrink-0"
                    style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
                  >
                    {loading
                      ? <Loader2 size={15} className="text-white animate-spin" />
                      : <ArrowRight size={15} className="text-white" />}
                  </button>
                </form>

                <div className="border-t" style={{ borderColor: "#ede8e2" }} />

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all duration-200 disabled:opacity-40"
                      style={{ border: "1px solid rgba(232,92,42,0.2)", color: "#6b5c4e" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff2ec"; (e.currentTarget as HTMLButtonElement).style.color = "#e85c2a"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "#6b5c4e"; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs mt-2 text-center" style={{ color: "#9e8876" }}>
                Every answer is grounded in cited sources · click references to verify
              </p>
            </div>
          </div>

          {/* Avatar — hidden on mobile */}
          <div className="hidden sm:flex w-80 shrink-0 items-center justify-center">
            <AvatarHero loading={loading} hasMessages={false} />
          </div>
        </div>
      )}

      {/* Active chat */}
      {hasMessages && !convLoading && (
        <>
          {/* Mini avatar — hidden on mobile */}
          <div className="hidden sm:block">
            <AvatarHero loading={loading} hasMessages={true} />
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 sm:gap-3 items-end animate-fade-in",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
                    style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
                  >
                    <Bot size={13} className="text-white" />
                  </div>
                )}

                <div className={cn("max-w-[88%] sm:max-w-[72%]", msg.role === "user" ? "order-first" : "")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed",
                      msg.role === "user" ? "text-white rounded-br-sm" : "rounded-bl-sm"
                    )}
                    style={msg.role === "user"
                      ? { background: "linear-gradient(135deg,#e85c2a,#f07a50)" }
                      : { background: "#ffffff", border: "1px solid #ede8e2", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                  >
                    {msg.role === "assistant" ? (
                      msg.streaming ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#3d2c1e" }}>
                          {msg.content || ""}
                          <span
                            className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-cursor align-middle"
                            style={{ background: "#e85c2a" }}
                          />
                        </p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className={[
                            "prose prose-sm max-w-none",
                            "prose-p:leading-relaxed prose-p:my-3",
                            "prose-headings:mt-5 prose-headings:mb-2",
                            "prose-li:my-1",
                            "prose-ul:my-3 prose-ol:my-3",
                          ].join(" ")}
                          components={{
                            a: ({ href, children }) => {
                              const label = String(children);
                              // linkifySources emits "SOURCE N" (no brackets) as link text
                              const isSource = /^SOURCE \d+$/.test(label);
                              if (isSource) {
                                const badge = (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all hover:opacity-80"
                                    style={{ background: "rgba(232,92,42,0.12)", color: "#c04a18", border: "1px solid rgba(232,92,42,0.3)" }}
                                  >
                                    [{label}]
                                  </span>
                                );
                                // Only link if there's a real navigable URL
                                const hasRealUrl = href && href !== "#" && !href.startsWith("file://");
                                return hasRealUrl ? (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline cursor-pointer">
                                    {badge}
                                  </a>
                                ) : badge;
                              }
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                  style={{ color: "#e85c2a" }} className="underline hover:opacity-80">
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {linkifySources(msg.content || "…", msg.citations ?? [])}
                        </ReactMarkdown>
                      )
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {msg.role === "assistant" && !msg.streaming && msg.citations && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <References citations={msg.citations} />
                      {msg.fromCache && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }}
                          title="Served from semantic cache"
                        >
                          ⚡ cached
                        </span>
                      )}
                    </div>
                  )}

                  {msg.role === "assistant" && !msg.streaming && msg.suggestions && msg.suggestions.length > 0 &&
                    messages[messages.length - 1].id === msg.id && (
                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {msg.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          disabled={loading || atLimit}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-40"
                          style={{ border: "1px solid rgba(232,92,42,0.2)", color: "#6b5c4e" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff2ec"; (e.currentTarget as HTMLButtonElement).style.color = "#e85c2a"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "#6b5c4e"; }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
                    style={{ background: "#fff2ec", border: "1px solid rgba(232,92,42,0.3)" }}
                  >
                    <User size={13} style={{ color: "#e85c2a" }} />
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {nearLimit && (
            <div className="shrink-0 px-3 sm:px-6 py-2 flex items-center justify-between"
              style={{ background: "rgba(232,92,42,0.06)", borderTop: "1px solid rgba(232,92,42,0.15)" }}>
              <span className="text-xs" style={{ color: "#6b5c4e" }}>
                {turnCount}/{MAX_TURNS} turns — consider starting a new conversation.
              </span>
            </div>
          )}
          {atLimit && (
            <div className="shrink-0 px-3 sm:px-6 py-3 flex items-center justify-between gap-3"
              style={{ background: "rgba(232,92,42,0.1)", borderTop: "1px solid rgba(232,92,42,0.2)" }}>
              <span className="text-xs font-medium" style={{ color: "#3d2c1e" }}>
                Limit reached. Start a new conversation to continue.
              </span>
              <button
                onClick={() => { setMessages([]); setConvId(null); onConversationCreated?.(null as unknown as string); }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
              >
                New
              </button>
            </div>
          )}

          {isGuest && !userId && messages.length > 0 && (
            <div className="shrink-0 px-3 sm:px-6 py-2 flex items-center justify-between"
              style={{ borderTop: "1px solid #ede8e2" }}>
              <span className="text-xs" style={{ color: "#9e8876" }}>Sign in to save your conversations</span>
              <button onClick={onRequestSignIn}
                className="text-xs underline" style={{ color: "#e85c2a" }}>
                Sign in
              </button>
            </div>
          )}

          {/* Bottom input */}
          <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4"
            style={{ background: "#ffffff", borderTop: "1px solid #ede8e2" }}>
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-2 sm:gap-3 max-w-3xl mx-auto"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={atLimit ? "Start a new conversation…" : "Ask about experience, projects, skills…"}
                disabled={loading || atLimit}
                className="flex-1 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none disabled:opacity-40 transition-all"
                style={{
                  background: "rgba(232,92,42,0.04)",
                  border: "1px solid rgba(232,92,42,0.25)",
                  color: "#1a1209",
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,92,42,0.15)")}
                onBlur={e => (e.currentTarget.style.boxShadow = "none")}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all duration-200 hover:scale-105 shrink-0"
                style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
              >
                {loading
                  ? <Loader2 size={16} className="text-white animate-spin" />
                  : <Send size={15} className="text-white" />}
              </button>
            </form>
            <p className="hidden sm:block text-center text-xs mt-2" style={{ color: "#9e8876" }}>
              Every answer is grounded in cited sources · click references to verify
            </p>
          </div>
        </>
      )}
    </div>
  );
}
