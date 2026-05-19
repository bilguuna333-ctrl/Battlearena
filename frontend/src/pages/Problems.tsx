import { useListProblems, useGetMe, getGetMeQueryKey, useGetMyMissions, useClaimMission, getGetMyMissionsQueryKey, useGetLeaderboard } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Code2, Zap, Trophy, Filter, Search, Check, Shuffle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Lock, BookOpen, Target, Compass, GraduationCap, Star, Plus, ChevronDown,
  Coins, Award, Swords, Flame, TrendingUp, BookMarked, Brain, Layers, Hash, ArrowRight, Sparkles, CircleDot, BarChart3, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

type SidebarTab = "library" | "quest" | "explore" | "study_plan";

export default function Problems() {
  const { data: problems, isLoading } = useListProblems();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const { data: xpLeaderboard } = useGetLeaderboard({ scope: "weekly", sort: "xp" } as any);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" }>({ key: "id", direction: "asc" });
  
  // New filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<SidebarTab>("library");
  
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Quest data
  const { data: missions, isLoading: missionsLoading } = useGetMyMissions({ query: { enabled: !!token, queryKey: getGetMyMissionsQueryKey() } });
  const claimMission = useClaimMission();

  const handleClaimMission = (id: number) => {
    claimMission.mutate(
      { id },
      {
        onSuccess: (res: any) => {
          toast({ title: "Шагнал авлаа!", description: `+${res?.rewardXp ?? 0} XP, +${res?.rewardCoins ?? 0} зоос` });
          qc.invalidateQueries({ queryKey: getGetMyMissionsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          toast({ title: "Шагнал авч чадсангүй", variant: "destructive" });
        },
      },
    );
  };

  const computedTags = useMemo(() => {
    if (!problems) return [];
    const counts: Record<string, number> = {};
    for (const p of problems) {
      if (p.tags) {
        for (const tag of p.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [problems]);

  const starProgress = useMemo(() => {
    if (!me) return null;
    const xp = me.xp || 0;
    const thresholds = [50, 150, 350, 700, 1500, 3000];
    let currentLevel = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) {
        currentLevel = i + 1;
      } else {
        break;
      }
    }
    
    if (currentLevel >= thresholds.length) {
      return { level: thresholds.length, current: xp, next: null, pointsNeeded: 0, percent: 100 };
    }
    
    const prevThreshold = currentLevel === 0 ? 0 : thresholds[currentLevel - 1];
    const nextThreshold = thresholds[currentLevel];
    const currentLevelXp = xp - prevThreshold;
    const levelTotalXp = nextThreshold - prevThreshold;
    
    return {
      level: currentLevel,
      current: currentLevelXp,
      next: levelTotalXp,
      pointsNeeded: nextThreshold - xp,
      percent: (currentLevelXp / levelTotalXp) * 100
    };
  }, [me]);

  // Mock data for trending companies
  const companies = [
    { name: "Google", count: 2265 },
    { name: "Apple", count: 308 },
    { name: "Amazon", count: 1969 },
    { name: "Bloomberg", count: 1184 },
    { name: "Microsoft", count: 1380 },
    { name: "TikTok", count: 358 },
    { name: "Infosys", count: 166 },
    { name: "Adobe", count: 160 },
  ];

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case "Хялбар": return "text-emerald-500";
      case "Дунд": return "text-yellow-500";
      case "Хүнд": return "text-red-500";
      case "Мэргэжлийн": return "text-purple-500";
      default: return "text-gray-400";
    }
  };

  const getDifficultyLabel = (diff: string) => {
    switch(diff) {
      case "Хялбар": return t("problems.easy");
      case "Дунд": return t("problems.medium");
      case "Хүнд": return t("problems.hard");
      case "Мэргэжлийн": return t("problems.expert");
      default: return diff;
    }
  }

  const filteredAndSortedProblems = useMemo(() => {
    if (!problems) return [];

    // Filter
    let result = problems.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toString().includes(searchQuery);

      // Real status filter using `solved` flag from the API.
      let matchStatus = true;
      if (selectedStatuses.length > 0) {
        const wantSolved = selectedStatuses.includes("Solved");
        const wantUnsolved = selectedStatuses.includes("Unsolved");
        if (wantSolved && wantUnsolved) {
          matchStatus = true;
        } else if (wantSolved) {
          matchStatus = !!(p as any).solved;
        } else if (wantUnsolved) {
          matchStatus = !(p as any).solved;
        }
      }

      const matchDifficulty = selectedDifficulties.length === 0 ? true : selectedDifficulties.includes(p.difficulty);
      const matchTag = selectedTags.length === 0 ? true : p.tags?.some(t => selectedTags.includes(t));

      return matchSearch && matchStatus && matchDifficulty && matchTag;
    });

    // Sort
    result.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Sort by real solved status. We treat `true` as the larger value so
      // direction "desc" puts solved problems first.
      if (sortConfig.key === "solved") {
        aVal = a.solved ? 1 : 0;
        bVal = b.solved ? 1 : 0;
      }
      // For difficulty, custom sorting
      else if (sortConfig.key === "difficulty") {
        const diffOrder: Record<string, number> = { "Хялбар": 1, "Дунд": 2, "Хүнд": 3, "Мэргэжлийн": 4 };
        aVal = diffOrder[a.difficulty] || 0;
        bVal = diffOrder[b.difficulty] || 0;
      }
      // Mock acceptance rate sort (since it's random, we'll just use id to keep it stable if sorting by acceptance)
      else if (sortConfig.key === "acceptance") {
        aVal = (a.id * 7) % 100;
        bVal = (b.id * 7) % 100;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [problems, searchQuery, sortConfig, selectedStatuses, selectedDifficulties, selectedTags]);

  const solvedCount = useMemo(
    () => (problems ?? []).filter((p) => (p as any).solved).length,
    [problems],
  );
  const totalCount = problems?.length ?? 0;

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40 hover:opacity-100" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 text-white" />;
    return <ArrowDown className="w-3.5 h-3.5 ml-1 text-white" />;
  };

  const toggleFilter = (state: string[], setState: (val: string[]) => void, value: string) => {
    if (state.includes(value)) {
      setState(state.filter(v => v !== value));
    } else {
      setState([...state, value]);
    }
  };

  const FilterCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <label className="flex items-center gap-3 cursor-pointer group mb-2.5">
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-white border-white' : 'bg-[#222] border-[#333] group-hover:border-[#555]'}`}>
        {checked && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
      </div>
      <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} transition-colors`}>{label}</span>
    </label>
  );

  return (
    <div className="flex-1 flex min-h-[calc(100vh-48px)] bg-[#111111] text-gray-300 font-sans">
      {/* ===== LIBRARY TAB ===== */}
      {activeTab === "library" && (
        <>
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("problems.search_questions")}
                  className="w-full bg-[#1e1e1e] border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-white/20 focus:bg-[#252525] transition-all placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-5">
                 <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-transparent border-2 border-white/10 relative overflow-hidden flex items-center justify-center">
                       <div
                         className="absolute inset-0 bg-emerald-500"
                         style={{
                           clipPath: `inset(${100 - (totalCount > 0 ? (solvedCount / totalCount) * 100 : 0)}% 0 0 0)`,
                         }}
                       ></div>
                    </div>
                    <span className="text-gray-400 text-sm">{solvedCount}/{totalCount} {t("problems.solved_count")}</span>
                 </div>
                 <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                   <Shuffle className="w-4 h-4" />
                 </Button>
              </div>
            </div>

            <div className="w-full text-left text-sm text-gray-500 border-b border-white/10 pb-2 mb-2 grid grid-cols-[40px_1fr_100px_100px_40px] px-2">
               <div
                 className="flex justify-center items-center cursor-pointer hover:text-gray-300 select-none"
                 onClick={() => requestSort("solved")}
                 title="Sort by solved status"
               >
                 <SortIcon columnKey="solved" />
               </div>
               <div 
                 className="font-medium flex items-center cursor-pointer hover:text-gray-300 select-none"
                 onClick={() => requestSort("id")}
               >
                 {t("problems.col_title")} <SortIcon columnKey="id" />
               </div>
               <div 
                 className="flex justify-end items-center pr-4 font-medium cursor-pointer hover:text-gray-300 select-none"
                 onClick={() => requestSort("acceptance")}
               >
                 {t("problems.col_acceptance")} <SortIcon columnKey="acceptance" />
               </div>
               <div 
                 className="font-medium flex items-center cursor-pointer hover:text-gray-300 select-none"
                 onClick={() => requestSort("difficulty")}
               >
                 {t("problems.difficulty")} <SortIcon columnKey="difficulty" />
               </div>
               <div></div>
            </div>

            <div className="space-y-1">
              {isLoading ? (
                [1,2,3,4,5,6].map(i => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)
              ) : filteredAndSortedProblems.length ? (
                filteredAndSortedProblems.map((problem, i) => {
                  const isSolved = !!(problem as any).solved;
                  const acceptance = ((problem.id * 7) % 40 + 20).toFixed(1);
                  
                  return (
                    <Link key={problem.id} href={`/problems/${problem.slug}`} className="block">
                      <div className="grid grid-cols-[40px_1fr_100px_100px_40px] items-center py-2.5 px-2 rounded hover:bg-white/5 transition-colors group cursor-pointer">
                        <div className="flex justify-center">
                           {isSolved ? (
                             <Check className="w-4 h-4 text-emerald-500" />
                           ) : (
                             <div className="w-4 h-4 opacity-0 group-hover:opacity-10 transition-opacity"><Check className="w-4 h-4" /></div>
                           )}
                        </div>
                        <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate pr-4 text-sm">
                          {problem.id}. {problem.title}
                        </div>
                        <div className="text-gray-400 text-sm text-right pr-4">
                          {acceptance}%
                        </div>
                        <div className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyLabel(problem.difficulty)}
                        </div>
                        <div className="text-gray-600 flex justify-center">
                           <Lock className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-16 text-center text-gray-500">
                  {t("problems.no_match")} "{searchQuery}"
                </div>
              )}
            </div>
          </main>

          <aside className="w-80 flex-shrink-0 border-l border-white/5 p-6 hidden xl:flex flex-col gap-6 bg-[#151515] overflow-y-auto">
            {starProgress && (
              <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-4 flex gap-4 items-center shadow-lg">
                 <div className="flex-1">
                   <div className="text-[13px] mb-3 font-medium text-white">
                      <span className="text-orange-400">{starProgress.pointsNeeded} more points</span> to get your {['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][starProgress.level]} star!
                   </div>
                   <div className="h-[5px] w-full bg-[#222] rounded-full border border-white/5 overflow-hidden mb-3">
                     <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${starProgress.percent}%` }}></div>
                   </div>
                   <div className="flex items-center text-xs font-medium">
                      <span className="text-gray-300">Rating: {me?.eloRating || 1000}</span>
                      <span className="mx-2 text-white/20">|</span>
                      <span className="text-gray-300">Points: {starProgress.current}/{starProgress.next}</span>
                   </div>
                 </div>
                 <div className="w-14 h-14 relative flex-shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                    <div className="absolute inset-[1.5px] bg-[#1a1a1a]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                    <div className="relative z-10 flex flex-col items-center justify-center pt-1">
                       <Code2 className="w-5 h-5 text-gray-300 mb-0.5" />
                       <span className="text-[9px] font-bold text-gray-400 tracking-wide">XP</span>
                    </div>
                 </div>
              </div>
            )}

            <div className="h-px bg-white/5 w-full"></div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase">Status</h3>
              <FilterCheckbox 
                label="Solved" 
                checked={selectedStatuses.includes("Solved")} 
                onChange={() => toggleFilter(selectedStatuses, setSelectedStatuses, "Solved")} 
              />
              <FilterCheckbox 
                label="Unsolved" 
                checked={selectedStatuses.includes("Unsolved")} 
                onChange={() => toggleFilter(selectedStatuses, setSelectedStatuses, "Unsolved")} 
              />
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase">Difficulty</h3>
              {["Хялбар", "Дунд", "Хүнд", "Мэргэжлийн"].map(diff => (
                <FilterCheckbox 
                  key={diff}
                  label={getDifficultyLabel(diff)} 
                  checked={selectedDifficulties.includes(diff)} 
                  onChange={() => toggleFilter(selectedDifficulties, setSelectedDifficulties, diff)} 
                />
              ))}
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase">Subdomains</h3>
              {computedTags.map(tag => (
                <FilterCheckbox 
                  key={tag.name}
                  label={tag.name} 
                  checked={selectedTags.includes(tag.name)} 
                  onChange={() => toggleFilter(selectedTags, setSelectedTags, tag.name)} 
                />
              ))}
            </div>
          </aside>
        </>
      )}

    </div>
  );
}
