import { useParams } from "wouter";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Trophy, Zap, Flame, Shield, History, Star, Target, Code2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { getRankColor, getRankBg } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading } = useGetUserProfile(username || "", {
    query: { enabled: !!username, queryKey: getGetUserProfileQueryKey(username || "") }
  });

  if (isLoading || !profile) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl flex flex-col gap-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl border border-white/10 bg-card overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50" />
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/5 border-2 border-white/10 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex-shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed || profile.username}`} alt={profile.username} className="w-full h-full object-cover bg-black/40" />
          </div>
          
          <div className="flex-1 flex flex-col h-full justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{profile.displayName}</h1>
            <p className="text-xl text-muted-foreground mb-4">@{profile.username}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className={`px-4 py-1.5 rounded-full border-2 font-bold text-sm tracking-wide ${getRankColor(profile.rank)} ${getRankBg(profile.rank)} shadow-lg`}>
                {profile.rank}
              </div>
              {profile.favoriteLanguage && (
                <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm bg-white/5 border-white/10 flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  {profile.favoriteLanguage}
                </Badge>
              )}
            </div>
            
            {profile.bio && (
              <p className="mt-6 text-gray-300 max-w-2xl leading-relaxed">{profile.bio}</p>
            )}
          </div>
          
          <div className="flex flex-col gap-4 min-w-[200px]">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-sm text-muted-foreground mb-1">Одоогийн ELO</div>
              <div className="text-3xl font-bold text-yellow-500 font-mono flex items-center justify-center gap-2">
                <Zap className="w-6 h-6" /> {profile.eloRating}
              </div>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-sm text-muted-foreground mb-1">Хамгийн өндөр</div>
              <div className="text-xl font-bold text-gray-300 font-mono">
                {profile.highestElo} <span className="text-xs font-sans text-muted-foreground">({profile.highestRank})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Stats & Badges */}
        <div className="flex flex-col gap-8">
          <div className="bg-card rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Статистик
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-muted-foreground">Нийт тулаан</span>
                <span className="font-bold font-mono">{profile.totalBattles}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-muted-foreground">Ялалтын хувь</span>
                <span className="font-bold font-mono text-emerald-400">{(profile.winRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-muted-foreground">Цуврал ялалт</span>
                <span className="font-bold font-mono text-orange-400 flex items-center gap-1">
                  {profile.winStreak} <Flame className="w-4 h-4 fill-current" />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ялалт / Ялагдал / Тэнцээ</span>
                <span className="font-bold font-mono text-sm">
                  <span className="text-emerald-400">{profile.battleWins}</span> / 
                  <span className="text-red-400"> {profile.battleLosses}</span> / 
                  <span className="text-gray-400"> {profile.battleDraws}</span>
                </span>
              </div>
            </div>
          </div>

          {profile.badges && profile.badges.length > 0 && (
            <div className="bg-card rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Тэмдэгнүүд
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {profile.badges.map(badge => (
                  <div key={badge.id} className="aspect-square bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center p-2 text-center group relative cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-2xl mb-1">{badge.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chart & History */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {/* ELO Chart */}
          <div className="bg-card rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              ELO Түүх
            </h3>
            <div className="h-[250px] w-full">
              {profile.eloHistory && profile.eloHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...profile.eloHistory].reverse()}>
                    <XAxis dataKey="createdAt" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: number) => [`${value} ELO`, 'Оноо']}
                    />
                    <Line type="monotone" dataKey="elo" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">Мэдээлэл байхгүй байна</div>
              )}
            </div>
          </div>

          {/* Recent Battles */}
          <div className="bg-card rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Ойрын тулаанууд
            </h3>
            
            <div className="space-y-3">
              {profile.recentMatches && profile.recentMatches.length > 0 ? (
                profile.recentMatches.map((match, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={match.battleId} 
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${match.result === 'win' ? 'bg-emerald-500' : match.result === 'loss' ? 'bg-red-500' : 'bg-gray-500'}`} />
                      <div>
                        <div className="font-bold text-sm mb-1">{match.problemTitle}</div>
                        <div className="text-xs text-muted-foreground">vs {match.opponentDisplayName} ({match.opponentElo})</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold font-mono ${match.result === 'win' ? 'text-emerald-400' : match.result === 'loss' ? 'text-red-400' : 'text-gray-400'}`}>
                        {match.eloChange > 0 ? '+' : ''}{match.eloChange}
                      </div>
                      <div className="text-xs text-muted-foreground">{match.eloAfter} ELO</div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                  Одоогоор тулаанд ороогүй байна
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
