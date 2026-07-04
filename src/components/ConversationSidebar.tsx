"use client";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

// All conversation API calls go through the Next.js proxy (/api/conversations/...)
// which verifies the NextAuth session server-side before forwarding to the backend.
// The client NEVER calls the FastAPI backend directly for conversations.

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  userId: string | null;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshTrigger?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ConversationSidebar({
  userId, activeConversationId, onSelect, onNew, refreshTrigger,
  mobileOpen = false, onMobileClose,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {});
  }, [userId, activeConversationId, refreshTrigger]);

  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (activeConversationId === id) onNew();
  };

  const handleSelect = (id: string) => { onSelect(id); onMobileClose?.(); };
  const handleNew = () => { onNew(); onMobileClose?.(); };

  if (!userId) return null;

  const panelContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full" style={{ background: "#f0ebe5" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 shrink-0">
        {(isMobile || !collapsed) && (
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9e8876" }}>
            Conversations
          </span>
        )}
        {isMobile ? (
          <button
            onClick={onMobileClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto"
            style={{ color: "#9e8876" }}
          >
            <X size={16} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all ml-auto"
            style={{ color: "#9e8876" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9e8876"; }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* New conversation */}
      <div className="px-2 mb-2 shrink-0">
        <button
          onClick={handleNew}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all",
            !isMobile && collapsed && "justify-center px-0"
          )}
          style={{ border: "1px solid rgba(232,92,42,0.25)", color: "#e85c2a", background: "#fff5f0" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff2ec"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff5f0"}
          title="New conversation"
        >
          <Plus size={14} className="shrink-0" />
          {(isMobile || !collapsed) && <span className="font-medium">New conversation</span>}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.map((conv) => {
          const isActive = activeConversationId === conv.id;
          return (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={cn(
                "group flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-left transition-all",
                !isMobile && collapsed && "justify-center px-0"
              )}
              style={{
                background: isActive ? "#fff2ec" : "transparent",
                color: isActive ? "#e85c2a" : "#6b5c4e",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(232,92,42,0.06)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              title={conv.title ?? "Untitled"}
            >
              <MessageSquare size={13} className="shrink-0 opacity-60" />
              {(isMobile || !collapsed) && (
                <>
                  <span className="flex-1 text-xs truncate">{conv.title ?? "Untitled"}</span>
                  <button
                    onClick={(e) => deleteConv(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all shrink-0"
                    style={{ color: "#9e8876" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#dc2626"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9e8876"}
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden sm:flex flex-col h-full shrink-0 transition-all duration-300",
          collapsed ? "w-12" : "w-60"
        )}
        style={{ borderRight: "1px solid #e0d8d0" }}
      >
        {panelContent(false)}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={onMobileClose}
          />
          <div
            className="fixed top-0 left-0 h-full z-50 w-72 sm:hidden"
            style={{ borderRight: "1px solid #e0d8d0" }}
          >
            {panelContent(true)}
          </div>
        </>
      )}
    </>
  );
}
