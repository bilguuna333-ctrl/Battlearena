import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Sword, Zap, Flame } from "lucide-react";
import { getRankColor, getRankBg } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Home() {
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user, isLoading } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!user) {
    return <Redirect to="/problems" />;
  }

  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: any }) {
  const t = useT();
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Stats Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-white/10 bg-card p-8">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Sword className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
              <img src={user.avatarUrl || ""} alt={user.username} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{user.displayName}</h2>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded border font-semibold ${getRankColor(user.rank)} ${getRankBg(user.rank)}`}>
                  {user.rank}
                </div>
                <div className="flex items-center gap-1 text-gray-300 font-medium">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  {user.eloRating} ELO
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <div className="text-sm text-gray-400 mb-1">{t("leaderboard.wins")}</div>
              <div className="text-2xl font-bold text-emerald-400">{user.battleWins}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">{t("leaderboard.losses")}</div>
              <div className="text-2xl font-bold text-red-400">{user.battleLosses}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">{t("home.streak")}</div>
              <div className="text-2xl font-bold text-orange-400 flex items-center gap-1">{user.winStreak}{user.winStreak > 0 && <Flame className="w-5 h-5 fill-current" />}</div>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="rounded-2xl border border-white/10 bg-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">{t("home.enter_battle")}</h3>
            <p className="text-sm text-gray-400 mb-6">{t("home.enter_battle_desc")}</p>
          </div>
          <Button size="lg" className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]" asChild>
            <Link href="/battle">{t("battle.find_match")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
