"use client";
import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { CitationChunk, getSourceMeta } from "@/lib/api";

interface Props {
  citations: CitationChunk[];
  proofId: string;
}

const SOURCE_COLORS: Record<string, string> = {
  github:   "bg-slate-700/80 text-slate-200 border-slate-600/40",
  linkedin: "bg-blue-900/60 text-blue-300 border-blue-700/30",
  calendar: "bg-emerald-900/60 text-emerald-300 border-emerald-700/30",
  resume:   "bg-violet-900/60 text-violet-300 border-violet-700/30",
  custom:   "bg-orange-900/60 text-orange-300 border-orange-700/30",
};

export function CitationDrawer({ citations, proofId }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (citations.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl glass-light border border-sky-500/10 text-sm overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sky-400/70 hover:text-sky-300 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-sky-400 group-hover:text-sky-300" />
          <span className="text-xs font-medium">
            {citations.length} source{citations.length > 1 ? "s" : ""} used
          </span>
          <a
            href={`/proof/${proofId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 text-xs text-sky-400 hover:text-sky-200 hover:underline transition-colors"
          >
            View proof <ExternalLink size={9} />
          </a>
        </div>
        {open
          ? <ChevronUp size={13} className="text-sky-500/50" />
          : <ChevronDown size={13} className="text-sky-500/50" />}
      </button>

      {/* Citations */}
      {open && (
        <div className="border-t border-sky-500/10 divide-y divide-sky-500/5">
          {citations.map((cit, i) => {
            const meta = getSourceMeta(cit.source_type);
            const colorClass = SOURCE_COLORS[cit.source_type] ?? "bg-slate-700/60 text-slate-300 border-slate-600/30";
            const isExpanded = expanded === cit.chunk_id;

            return (
              <div key={cit.chunk_id} className="px-4 py-3 hover:bg-sky-400/3 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-sky-500/40">[{i + 1}]</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", colorClass)}>
                      {meta.label}
                    </span>
                    <span className="text-slate-300 text-xs font-medium">{cit.source_title}</span>
                    {cit.source_url && (
                      <a
                        href={cit.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400/60 hover:text-sky-300 transition-colors"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-sky-400/40 shrink-0 tabular-nums">
                    {Math.round(cit.similarity_score * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => setExpanded(isExpanded ? null : cit.chunk_id)}
                  className="mt-1.5 text-xs text-sky-400/40 hover:text-sky-300/70 transition-colors"
                >
                  {isExpanded ? "Hide excerpt ↑" : "Show excerpt ↓"}
                </button>

                {isExpanded && (
                  <blockquote className="mt-2 pl-3 border-l-2 border-sky-500/30 text-xs text-slate-400 italic leading-relaxed">
                    {cit.chunk_text.slice(0, 420)}
                    {cit.chunk_text.length > 420 ? "…" : ""}
                  </blockquote>
                )}
                {cit.date_indexed && (
                  <p className="mt-1 text-xs text-sky-500/25">
                    Indexed {formatDate(cit.date_indexed)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
