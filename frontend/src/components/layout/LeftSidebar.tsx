import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Swords, Trophy, Users, Target, Flame, Star, Plus, ChevronDown, Lock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEloLevel } from "@/lib/utils";

export function LeftSidebar() {
  const [location] = useLocation();
  const t = useT();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, queryKey: getGetMeQueryKey() } });

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/5 p-4 hidden lg:block bg-[#1a1a1a]">
      {/* User Stats */}
      {user && (
        <div className="mb-6 p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="w-10 h-10 border border-white/10">
              <AvatarImage src={(user as any).avatarUrl || (user.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}` : undefined)} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 text-sm font-bold">
                {user.displayName?.[0] || user.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{user.displayName || user.username}</p>
              <p className="text-xs text-gray-500">{user.title || "Шинэ тоглогч"}</p>
            </div>
          </div>
          {/* ELO Level with circular gauge */}
          {(() => {
            const elo = (user as any).elo || (user as any).rating || 1000;
            const levelInfo = getEloLevel(elo);
            const circumference = 2 * Math.PI * 12;
            const strokeDashoffset = circumference - (levelInfo.progress / 100) * circumference;
            return (
              <div className="flex items-center gap-2 justify-center">
                <div className="relative w-7 h-7">
                  <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="12" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
                    <circle 
                      cx="14" cy="14" r="12" fill="none" 
                      stroke={levelInfo.color} strokeWidth="2" 
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span 
                    className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ color: levelInfo.color }}
                  >
                    {levelInfo.level}
                  </span>
                </div>
                <span className="text-sm font-bold text-white">{elo.toLocaleString()}</span>
              </div>
            );
          })()}
        </div>
      )}
      <div className="space-y-1 mb-6">
        <Link href="/problems">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/problems') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <BookOpen className="w-4 h-4" /> {t("problems.library")}
          </Button>
        </Link>
      </div>
      
      <div className="space-y-1 mb-6">
        <Link href="/battle">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/battle') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Swords className="w-4 h-4" /> {t("nav.battle")}
          </Button>
        </Link>
        <Link href="/leaderboard">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/leaderboard') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Trophy className="w-4 h-4" /> {t("nav.leaderboard")}
          </Button>
        </Link>
        <Link href="/social">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/social') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Users className="w-4 h-4" /> {t("nav.social")}
          </Button>
        </Link>
        <Link href="/missions">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/missions') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Target className="w-4 h-4" /> {t("nav.missions")}
          </Button>
        </Link>
        <Link href="/bosses">
          <Button variant="ghost" className={`w-full justify-start gap-3 ${location.startsWith('/bosses') ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Flame className="w-4 h-4" /> {t("nav.bosses")}
          </Button>
        </Link>
      </div>
      
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 px-3 mb-2 font-medium tracking-wide">
          {t("problems.my_lists")}
          <div className="flex gap-2">
            <Plus className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
            <ChevronDown className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/5">
          <Star className="w-4 h-4 text-orange-500" /> {t("problems.favorite")}
          <Lock className="w-3.5 h-3.5 ml-auto opacity-40" />
        </Button>
      </div>
    </aside>
  );
}
