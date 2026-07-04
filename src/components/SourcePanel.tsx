"use client";
import { useEffect, useState } from "react";
import { Github, Linkedin, Calendar, FileText, Globe, RefreshCw, CheckSquare, Square } from "lucide-react";
import { fetchGithubRepos, GitHubRepo, SourceFilter } from "@/lib/api";
import { cn } from "@/lib/utils";

type TabId = "all" | "github" | "linkedin" | "calendar" | "files";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  iconClass: string;
  sourceType: string | null; // null = "All"
}

const TABS: Tab[] = [
  { id: "all",      label: "All",      icon: Globe,     iconClass: "text-violet-400",  sourceType: null       },
  { id: "github",   label: "GitHub",   icon: Github,    iconClass: "text-slate-300",   sourceType: "github"   },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin,  iconClass: "text-blue-400",    sourceType: "linkedin" },
  { id: "calendar", label: "Calendar", icon: Calendar,  iconClass: "text-emerald-400", sourceType: "calendar" },
  { id: "files",    label: "Files",    icon: FileText,  iconClass: "text-orange-400",  sourceType: "custom"   },
];

interface Props {
  onFilterChange: (filter: SourceFilter) => void;
}

export function SourcePanel({ onFilterChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Load GitHub repos when GitHub tab is first opened
  useEffect(() => {
    if (activeTab === "github" && repos.length === 0) {
      loadRepos();
    }
  }, [activeTab]);

  // Propagate filter up whenever tab or selected repos change
  useEffect(() => {
    const tab = TABS.find((t) => t.id === activeTab)!;

    if (activeTab === "all") {
      onFilterChange({ source_types: null, repo_filter: null });
    } else if (activeTab === "github") {
      const repoList = selectedRepos.size > 0 ? Array.from(selectedRepos) : null;
      onFilterChange({ source_types: ["github"], repo_filter: repoList });
    } else {
      onFilterChange({ source_types: [tab.sourceType!], repo_filter: null });
    }
  }, [activeTab, selectedRepos]);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const data = await fetchGithubRepos();
      setRepos(data);
      // Default: all selected
      setSelectedRepos(new Set(data.map((r) => r.repo_name)));
    } finally {
      setLoadingRepos(false);
    }
  }

  function toggleRepo(name: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRepos.size === repos.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(repos.map((r) => r.repo_name)));
    }
  }

  const allSelected = repos.length > 0 && selectedRepos.size === repos.length;

  return (
    <div className="flex flex-col h-full glass border-r border-violet-500/10 w-56 shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-violet-500/10">
        <p className="text-xs font-semibold text-violet-400/60 uppercase tracking-widest">
          Context
        </p>
      </div>

      {/* Tabs */}
      <nav className="flex flex-col gap-0.5 p-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 text-left w-full",
                isActive
                  ? "bg-violet-500/15 text-white"
                  : "text-violet-300/50 hover:text-violet-200 hover:bg-violet-500/8"
              )}
            >
              <Icon size={14} className={isActive ? tab.iconClass : "text-current"} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* GitHub repo list */}
      {activeTab === "github" && (
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="border-t border-violet-500/10 pt-2 mt-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs text-violet-400/40">Repositories</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleAll}
                  className="text-xs text-violet-400/50 hover:text-violet-300 transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                </button>
                <button
                  onClick={loadRepos}
                  disabled={loadingRepos}
                  className="text-violet-400/50 hover:text-violet-300 transition-colors disabled:opacity-30"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={loadingRepos ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {loadingRepos && (
              <div className="flex items-center justify-center py-6">
                <RefreshCw size={14} className="text-violet-400/40 animate-spin" />
              </div>
            )}

            {!loadingRepos && repos.length === 0 && (
              <p className="text-xs text-violet-400/30 text-center py-4 px-2">
                No repos ingested yet.
                <br />Sync GitHub from Admin.
              </p>
            )}

            {!loadingRepos && repos.map((repo) => {
              const checked = selectedRepos.has(repo.repo_name);
              return (
                <button
                  key={repo.repo_name}
                  onClick={() => toggleRepo(repo.repo_name)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-all duration-150 group",
                    checked
                      ? "text-slate-200"
                      : "text-violet-300/30 hover:text-violet-300/60"
                  )}
                >
                  {/* Checkbox */}
                  <span className="shrink-0">
                    {checked
                      ? <CheckSquare size={13} className="text-violet-400" />
                      : <Square size={13} className="text-violet-400/30 group-hover:text-violet-400/50" />
                    }
                  </span>

                  {/* Repo name */}
                  <span className="text-xs truncate font-mono leading-tight">
                    {repo.repo_name}
                  </span>
                </button>
              );
            })}

            {/* Active filter hint */}
            {repos.length > 0 && selectedRepos.size > 0 && selectedRepos.size < repos.length && (
              <p className="text-xs text-violet-400/30 text-center mt-3 px-2">
                Querying {selectedRepos.size} of {repos.length} repos
              </p>
            )}
            {repos.length > 0 && selectedRepos.size === 0 && (
              <p className="text-xs text-amber-400/50 text-center mt-3 px-2">
                No repos selected — no results
              </p>
            )}
          </div>
        </div>
      )}

      {/* Other tabs: just a hint */}
      {activeTab !== "all" && activeTab !== "github" && (
        <div className="flex-1 px-3 pt-2">
          <p className="text-xs text-violet-400/30 leading-relaxed">
            All {TABS.find(t => t.id === activeTab)?.label} chunks will be included in queries.
          </p>
        </div>
      )}

      {/* All tab hint */}
      {activeTab === "all" && (
        <div className="flex-1 px-3 pt-2">
          <p className="text-xs text-violet-400/30 leading-relaxed">
            All sources included. Select a connector to filter context.
          </p>
        </div>
      )}

      {/* Active filter badge at bottom */}
      <div className="shrink-0 px-3 py-2 border-t border-violet-500/10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-violet-400/40">
            {activeTab === "all"
              ? "All sources"
              : activeTab === "github" && selectedRepos.size > 0
                ? `${selectedRepos.size} repo${selectedRepos.size > 1 ? "s" : ""}`
                : TABS.find(t => t.id === activeTab)?.label ?? ""}
          </span>
        </div>
      </div>
    </div>
  );
}
