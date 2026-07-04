const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CitationChunk {
  chunk_id: string;
  source_type: string;
  source_url?: string;
  source_title: string;
  chunk_text: string;
  similarity_score: number;
  date_indexed?: string;
}

export interface ProofRecord {
  proof_id: string;
  question: string;
  answer: string;
  citations: CitationChunk[];
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
}

export interface GitHubRepo {
  repo_name: string;
  source_url: string;
  last_indexed: string;
}

export interface SourceFilter {
  /** null = all sources; non-null = restrict to these source types */
  source_types: string[] | null;
  /** GitHub repo names to restrict to (only relevant when source_types includes "github") */
  repo_filter: string[] | null;
}

/** Fetch a proof record by ID */
export async function fetchProof(proofId: string): Promise<ProofRecord> {
  const res = await fetch(`${API_URL}/proof/${proofId}`);
  if (!res.ok) throw new Error("Proof not found");
  return res.json();
}

/** Fetch ingested GitHub repos */
export async function fetchGithubRepos(): Promise<GitHubRepo[]> {
  const res = await fetch(`${API_URL}/sources/github/repos`);
  if (!res.ok) return [];
  return res.json();
}

/** Source type to human-readable label + icon name */
export const SOURCE_META: Record<string, { label: string; color: string }> = {
  github:   { label: "GitHub",          color: "bg-gray-800 text-white" },
  linkedin: { label: "LinkedIn",        color: "bg-blue-700 text-white" },
  calendar: { label: "Google Calendar", color: "bg-green-600 text-white" },
  resume:   { label: "Resume",          color: "bg-purple-600 text-white" },
  custom:   { label: "Custom",          color: "bg-orange-500 text-white" },
};

export function getSourceMeta(type: string) {
  return SOURCE_META[type] ?? { label: type, color: "bg-gray-500 text-white" };
}
