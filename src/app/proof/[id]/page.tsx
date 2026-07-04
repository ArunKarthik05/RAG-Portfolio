import { fetchProof, getSourceMeta, ProofRecord } from "@/lib/api";
import { ShieldCheck, ExternalLink, Clock, Cpu } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

const SOURCE_COLORS: Record<string, string> = {
  github:   "bg-slate-700/80 text-slate-200 border-slate-600/40",
  linkedin: "bg-blue-900/60 text-blue-300 border-blue-700/30",
  calendar: "bg-emerald-900/60 text-emerald-300 border-emerald-700/30",
  resume:   "bg-violet-900/60 text-violet-300 border-violet-700/30",
  custom:   "bg-orange-900/60 text-orange-300 border-orange-700/30",
};

export default async function ProofPage({ params }: { params: { id: string } }) {
  let proof: ProofRecord;
  try {
    proof = await fetchProof(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Background */}
      <div className="fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%, #0c1f4a, #020c1b 70%)" }} />

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center glow-blue"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
          >
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Proof of Answer</h1>
            <p className="text-xs text-sky-400/50">
              Immutable record · <code className="font-mono">{params.id.slice(0, 8)}…</code>
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="glass gradient-border rounded-2xl p-4 flex flex-wrap gap-4 text-xs text-sky-400/60">
          <span className="flex items-center gap-1.5"><Clock size={12} />{formatDate(proof.created_at)}</span>
          <span className="flex items-center gap-1.5"><Cpu size={12} />{proof.model_used}</span>
          <span>{proof.prompt_tokens + proof.completion_tokens} tokens</span>
        </div>

        {/* Question */}
        <div className="glass gradient-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-sky-400/40 uppercase tracking-widest mb-2">Question</p>
          <p className="text-white font-medium">{proof.question}</p>
        </div>

        {/* Answer */}
        <div className="glass gradient-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-sky-400/40 uppercase tracking-widest mb-3">Answer</p>
          <div className="prose prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{proof.answer}</ReactMarkdown>
          </div>
        </div>

        {/* Citations */}
        <div className="glass gradient-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-sky-400/40 uppercase tracking-widest mb-4">
            Source Chunks ({proof.citations.length})
          </p>
          <div className="space-y-3">
            {proof.citations.map((cit, i) => {
              const meta = getSourceMeta(cit.source_type);
              const colorClass = SOURCE_COLORS[cit.source_type] ?? "bg-slate-700/60 text-slate-300 border-slate-600/30";
              return (
                <div key={cit.chunk_id} className="rounded-xl border border-sky-500/10 bg-sky-400/3 p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono text-xs text-sky-500/40">[{i + 1}]</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${colorClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-medium text-slate-300">{cit.source_title}</span>
                    {cit.source_url && (
                      <a href={cit.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-sky-400/60 hover:text-sky-300 flex items-center gap-0.5 text-xs">
                        <ExternalLink size={11} /> Source
                      </a>
                    )}
                    <span className="ml-auto text-xs text-sky-400/40">
                      {Math.round(cit.similarity_score * 100)}% match
                    </span>
                  </div>
                  <blockquote className="pl-3 border-l-2 border-sky-500/30 text-xs text-slate-400 italic leading-relaxed">
                    {cit.chunk_text}
                  </blockquote>
                  {cit.date_indexed && (
                    <p className="mt-2 text-xs text-sky-500/25">Indexed {formatDate(cit.date_indexed)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-sky-400/25 pb-6">
          This record is immutable. The answer above was generated solely from the sources listed.
        </p>
      </div>
    </div>
  );
}
