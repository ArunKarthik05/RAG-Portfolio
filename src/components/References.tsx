"use client";
import { useState } from "react";
import { Github, Linkedin, Calendar, FileText, Globe, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { CitationChunk } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  citations: CitationChunk[];
}

const SOURCE_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
}> = {
  github: {
    icon: Github,
    label: "GitHub",
    iconColor: "#3d2c1e",
    badgeBg: "#f0ebe5",
    badgeColor: "#3d2c1e",
    borderColor: "#e0d8d0",
  },
  linkedin: {
    icon: Linkedin,
    label: "LinkedIn",
    iconColor: "#0077b5",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    borderColor: "#bfdbfe",
  },
  calendar: {
    icon: Calendar,
    label: "Google Calendar",
    iconColor: "#16a34a",
    badgeBg: "#f0fdf4",
    badgeColor: "#15803d",
    borderColor: "#bbf7d0",
  },
  resume: {
    icon: FileText,
    label: "Resume",
    iconColor: "#e85c2a",
    badgeBg: "#fff2ec",
    badgeColor: "#c04a18",
    borderColor: "rgba(232,92,42,0.25)",
  },
  custom: {
    icon: FileText,
    label: "Document",
    iconColor: "#e85c2a",
    badgeBg: "#fff2ec",
    badgeColor: "#c04a18",
    borderColor: "rgba(232,92,42,0.25)",
  },
};

const DEFAULT_SOURCE = {
  icon: Globe,
  label: "Source",
  iconColor: "#0284c7",
  badgeBg: "#f0f9ff",
  badgeColor: "#0369a1",
  borderColor: "#bae6fd",
};

function getSource(type: string) {
  return SOURCE_CONFIG[type] ?? DEFAULT_SOURCE;
}

function ReferenceCard({ cit, index }: { cit: CitationChunk; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const src = getSource(cit.source_type);
  const Icon = src.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "#ffffff", border: `1px solid ${src.borderColor}` }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono shrink-0"
          style={{ background: "#fff2ec", color: "#e85c2a" }}
        >
          {index + 1}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Icon size={13} style={{ color: src.iconColor }} />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-md"
            style={{ background: src.badgeBg, color: src.badgeColor, border: `1px solid ${src.borderColor}` }}
          >
            {src.label}
          </span>
        </div>
        <span className="text-xs truncate flex-1" style={{ color: "#3d2c1e" }}>
          {cit.source_title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {cit.source_url && !cit.source_url.startsWith("file://") && (
            <a href={cit.source_url} target="_blank" rel="noopener noreferrer"
              style={{ color: "#9e8876" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e85c2a"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9e8876"}
            >
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ color: "#9e8876" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e85c2a"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9e8876"}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: "1px solid #f0ebe5" }}>
          <p className="text-xs italic leading-relaxed whitespace-pre-wrap" style={{ color: "#6b5c4e" }}>
            {cit.chunk_text}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 rounded-full" style={{ width: `${Math.round(cit.similarity_score * 100)}%`, background: "rgba(232,92,42,0.3)" }} />
            <span className="text-xs tabular-nums" style={{ color: "#9e8876" }}>
              {Math.round(cit.similarity_score * 100)}% relevance
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function References({ citations }: Props) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  const uniqueSources = [...new Map(citations.map((c) => [c.source_type, c])).values()];

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 w-full text-left px-1 py-1 group">
        <div className="flex items-center -space-x-1">
          {uniqueSources.map((c) => {
            const s = getSource(c.source_type);
            const Icon = s.icon;
            return (
              <span key={c.source_type} className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#f0ebe5", border: "1px solid #e0d8d0" }}>
                <Icon size={10} style={{ color: s.iconColor }} />
              </span>
            );
          })}
        </div>
        <span className="text-xs transition-colors" style={{ color: "#9e8876" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e85c2a"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9e8876"}
        >
          {citations.length} reference{citations.length > 1 ? "s" : ""}
        </span>
        <span className="text-xs ml-auto transition-colors" style={{ color: "#b8a898" }}>
          {open ? "hide ↑" : "show ↓"}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {citations.map((cit, i) => (
            <ReferenceCard key={cit.chunk_id} cit={cit} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
