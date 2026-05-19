import { useState } from "react";
import { Link } from "wouter";
import {
  useGetLeaderboard,
  GetLeaderboardScope,
} from "@workspace/api-client-react";

type GetLeaderboardSort = "elo" | "xp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Sparkles, Swords } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Leaderboard() {
  const t = useT();
  const [board, setBoard] = useState<GetLeaderboardSort>("elo");
  const [scope, setScope] = useState<GetLeaderboardScope>("global");

  const { data: leaderboard, isLoading } = useGetLeaderboard({
    scope,
    sort: board,
  } as any);

  const isXp = board === "xp";
  // Subtle accent color per board (used on tab underline + score column)
  const accent = isXp ? "text-purple-400" : "text-orange-400";
  const accentBorder = isXp ? "border-purple-400" : "border-orange-400";

  const boardTabs: {
    value: GetLeaderboardSort;
    label: string;
    icon: typeof Swords;
  }[] = [
    { value: "elo", label: t("leaderboard.board_elo"), icon: Swords },
    { value: "xp", label: t("leaderboard.board_xp"), icon: Sparkles },
  ];

  const scopeTabs: { value: GetLeaderboardScope; label: string }[] = [
    { value: "global", label: t("leaderboard.all_time") },
    { value: "season", label: t("leaderboard.season") },
    { value: "monthly", label: t("leaderboard.monthly") },
    { value: "weekly", label: t("leaderboard.weekly") },
  ];

  const renderRank = (position: number) => {
    if (position === 1)
      return (
        <Trophy className="w-4 h-4 mx-auto text-yellow-400" />
      );
    if (position === 2)
      return <Trophy className="w-4 h-4 mx-auto text-gray-300" />;
    if (position === 3)
      return <Trophy className="w-4 h-4 mx-auto text-amber-600" />;
    return (
      <span className="text-sm text-gray-500 group-hover:text-gray-300">
        {position}
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#111111] text-gray-300 font-sans">
      <main className="max-w-5xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              isXp
                ? "bg-purple-500/10 border-purple-500/30"
                : "bg-orange-500/10 border-orange-500/30"
            }`}
          >
            <Trophy className={`w-4 h-4 ${accent}`} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white leading-tight">
              {t("leaderboard.title")}
            </h1>
            <p className="text-xs text-gray-500">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>

        {/* Board switch (ELO / XP) */}
        <div className="flex items-center gap-1 mb-4 border-b border-white/5">
          {boardTabs.map((tab) => {
            const active = board === tab.value;
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setBoard(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  active
                    ? `${accent} ${accentBorder}`
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scope filter */}
        <div className="flex items-center gap-1 mb-4">
          {scopeTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setScope(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                scope === tab.value
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_120px_100px_80px] items-center text-xs text-gray-500 border-b border-white/10 pb-2 mb-2 px-2">
          <div className="text-center">#</div>
          <div>{t("leaderboard.player")}</div>
          <div className="text-right pr-4">{isXp ? "XP" : "ELO"}</div>
          <div className="text-right pr-4">
            {isXp ? t("leaderboard.wins") : t("leaderboard.win_rate")}
          </div>
          <div className="text-right">{t("leaderboard.streak")}</div>
        </div>

        {/* Rows */}
        <div className="space-y-0.5">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-12 bg-white/5 rounded animate-pulse"
              />
            ))
          ) : leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry) => {
              const isTop3 = entry.position <= 3;
              return (
                <Link
                  key={entry.username}
                  href={`/profile/${entry.username}`}
                  className="block"
                >
                  <div
                    className={`grid grid-cols-[40px_1fr_120px_100px_80px] items-center py-2.5 px-2 rounded transition-colors group cursor-pointer ${
                      isTop3
                        ? "bg-white/[0.03] hover:bg-white/[0.06]"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Position */}
                    <div className="text-center">
                      {renderRank(entry.position)}
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <Avatar className="h-7 w-7 border border-white/10">
                        <AvatarImage src={(entry as any).avatarUrl || (entry.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.avatarSeed}` : "")} />
                        <AvatarFallback className="text-[10px] bg-white/5 text-gray-400">
                          {entry.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                          {entry.displayName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          @{entry.username}
                          <span className="mx-1.5 text-white/10">·</span>
                          <span className="text-gray-400">{entry.rank}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div
                      className={`text-right pr-4 text-sm font-mono font-semibold ${accent}`}
                    >
                      {isXp ? ((entry as any).xp || 0).toLocaleString() : entry.eloRating}
                    </div>

                    {/* Wins / Win-rate */}
                    <div className="text-right pr-4 text-sm text-gray-300">
                      {isXp
                        ? entry.battleWins
                        : `${(entry.winRate * 100).toFixed(1)}%`}
                    </div>

                    {/* Streak */}
                    <div className="text-right text-sm">
                      {entry.winStreak >= 3 ? (
                        <span className="inline-flex items-center justify-end gap-1 text-orange-400 font-medium">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          {entry.winStreak}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {entry.winStreak}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              {t("leaderboard.no_data")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
