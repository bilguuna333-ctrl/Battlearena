import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetUserProfile, getGetUserProfileQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Trophy, Zap, Flame, Shield, History, Star, Target, Code2, Edit2, CheckCircle2, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getRankColor, getRankBg, getEloLevel } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  
  const { data: profile, isLoading } = useGetUserProfile(username || "", {
    query: { enabled: !!username, queryKey: getGetUserProfileQueryKey(username || "") }
  });

  const isMyProfile = me?.username === profile?.username;
  
  // Edit Profile State
  const [openEdit, setOpenEdit] = useState(false);
  const [editAvatarSeed, setEditAvatarSeed] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && openEdit) {
      setEditAvatarSeed(profile.avatarSeed || profile.username);
      setEditAvatarUrl((profile as any).avatarUrl || null);
      setEditBio(profile.bio || "");
    }
  }, [profile, openEdit]);

  const resizeImage = (file: File, maxSize: number = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        // Scale down to fit within maxSize x maxSize
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Зураг уншихад алдаа гарлаа"));
      };
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 256);
        setEditAvatarUrl(resized);
      } catch {
        toast({ title: "Зураг уншихад алдаа гарлаа", variant: "destructive" });
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await apiRequest("/api/me/profile", {
        method: "POST",
        body: JSON.stringify({ avatarSeed: editAvatarSeed, avatarUrl: editAvatarUrl, bio: editBio })
      });
      toast({ title: "Профайл амжилттай шинэчлэгдлээ" });
      qc.invalidateQueries({ queryKey: getGetUserProfileQueryKey(username || "") });
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setOpenEdit(false);
    } catch (e: any) {
      toast({ title: e.message || "Алдаа гарлаа", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const generateRandomSeed = () => {
    setEditAvatarSeed(Math.random().toString(36).substring(2, 10));
    setEditAvatarUrl(null);
  };

  // Auto-open edit dialog for new users without custom avatar
  useEffect(() => {
    if (profile && isMyProfile && !(profile as any).avatarUrl && !profile.bio) {
      setOpenEdit(true);
    }
  }, [profile, isMyProfile]);

  if (isLoading || !profile) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl flex flex-col gap-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50" />
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="relative group cursor-pointer" onClick={() => isMyProfile && setOpenEdit(true)}>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/5 border-2 border-white/10 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex-shrink-0 transition-transform group-hover:scale-105">
              <img src={(profile as any).avatarUrl || (profile.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}` : "")} alt={profile.username} className="w-full h-full object-cover bg-black/40" />
            </div>
            {isMyProfile && (
              <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border-2 border-primary">
                <Edit2 className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col h-full justify-center">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{profile.displayName}</h1>
              {isMyProfile && (
                <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden md:flex bg-white/5 border-white/10 hover:bg-white/10 text-gray-300">
                      <Edit2 className="w-4 h-4 mr-2" /> {t("profile.edit")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111] border border-white/10 sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-white">{t("profile.edit")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group/avatar">
                          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <img src={editAvatarUrl || ""} alt="Preview" className="w-full h-full object-cover bg-black/40" />
                          </div>
                          <Button 
                            type="button"
                            variant="secondary" 
                            size="icon" 
                            className="absolute -bottom-2 -right-2 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg"
                            onClick={generateRandomSeed}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="w-full space-y-3">
                          <div className="space-y-1">
                            <label className="text-sm text-gray-400 font-medium">Шинэ зураг оруулах</label>
                            <Input 
                              type="file" 
                              accept="image/*"
                              onChange={handleFileChange} 
                              className="bg-black/50 border-white/10 file:text-white file:bg-white/10 file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-full hover:file:bg-white/20 text-gray-300"
                            />
                          </div>
                          <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">ЭСВЭЛ</span>
                            <div className="flex-grow border-t border-white/10"></div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm text-gray-400 font-medium">Зургаа солих (өөр үг бичих)</label>
                            <Input 
                              value={editAvatarSeed} 
                              onChange={(e) => {
                                setEditAvatarSeed(e.target.value);
                                setEditAvatarUrl(null);
                              }} 
                              className="bg-black/50 border-white/10 focus-visible:ring-primary text-white"
                              placeholder="Дурын үг бичээд зургаа өөрчилнө үү..."
                            />
                          </div>
                        </div>
                      </div>
                      <div className="w-full space-y-2">
                        <label className="text-sm text-gray-400 font-medium">{t("profile.bio")}</label>
                        <Textarea 
                          value={editBio} 
                          onChange={(e) => setEditBio(e.target.value)} 
                          className="bg-black/50 border-white/10 focus-visible:ring-primary min-h-[100px] text-white"
                        />
                      </div>
                      <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11">
                        {isSaving ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : t("profile.save")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xl text-primary/80 font-medium mb-4">@{profile.username}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className={`px-4 py-1.5 rounded-full border-2 font-bold text-sm tracking-wide ${getRankColor(profile.rank)} ${getRankBg(profile.rank)} shadow-lg`}>
                {profile.rank}
              </div>
              {profile.favoriteLanguage && (
                <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm bg-white/5 border-white/10 flex items-center gap-2 text-gray-300">
                  <Code2 className="w-4 h-4" />
                  {profile.favoriteLanguage}
                </Badge>
              )}
            </div>
            
            {profile.bio && (
              <p className="mt-6 text-gray-300 max-w-2xl leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                {profile.bio}
              </p>
            )}
            
            {isMyProfile && (
               <Button variant="outline" size="sm" className="md:hidden mt-4 w-fit mx-auto bg-white/5 border-white/10 hover:bg-white/10 text-gray-300" onClick={() => setOpenEdit(true)}>
                 <Edit2 className="w-4 h-4 mr-2" /> {t("profile.edit")}
               </Button>
            )}
          </div>
          
          <div className="flex flex-col gap-4 min-w-[200px]">
            <div className="bg-black/40 rounded-2xl p-5 border border-white/5 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {(() => {
                const eloInfo = getEloLevel(profile.eloRating);
                return (
                  <div className="flex items-center justify-center gap-3">
                    {/* Circular Level Badge */}
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#333" strokeWidth="2.5" />
                        <circle 
                          cx="18" cy="18" r="16" fill="none" 
                          stroke={eloInfo.color} strokeWidth="2.5" 
                          strokeDasharray={`${eloInfo.progress} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold" style={{ color: eloInfo.color }}>{eloInfo.level}</span>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-white">{profile.eloRating.toLocaleString()}</span>
                  </div>
                );
              })()}
            </div>
            <div className="bg-black/40 rounded-2xl p-5 border border-white/5 text-center">
              <div className="text-sm text-gray-400 mb-1 font-medium">{t("profile.highest_elo")}</div>
              <div className="text-2xl font-bold text-gray-300 font-mono">
                {profile.highestElo}
              </div>
              <div className="text-xs font-sans text-gray-500 mt-1 uppercase tracking-wider">{profile.highestRank}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Stats & Badges */}
        <div className="flex flex-col gap-8">
          <div className="bg-[#111] rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
             <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-primary" />
              {t("profile.stats")}
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-gray-400 font-medium">{t("profile.total_battles")}</span>
                <span className="font-bold font-mono text-white text-lg">{profile.totalBattles}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-gray-400 font-medium">{t("profile.win_rate")}</span>
                <span className="font-bold font-mono text-emerald-400 text-lg">{(profile.winRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-gray-400 font-medium">{t("profile.win_streak")}</span>
                <span className="font-bold font-mono text-orange-400 text-lg flex items-center gap-1.5">
                  {profile.winStreak}
                  {profile.winStreak > 0 && <Flame className="w-4 h-4 fill-current" />}
                </span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-gray-400 font-medium text-sm">{t("profile.wld")}</span>
                <div className="flex h-3 w-full bg-black/50 rounded-full overflow-hidden">
                   <div style={{ width: `${(profile.battleWins / Math.max(profile.totalBattles, 1)) * 100}%` }} className="bg-emerald-500" />
                   <div style={{ width: `${(profile.battleLosses / Math.max(profile.totalBattles, 1)) * 100}%` }} className="bg-red-500" />
                   <div style={{ width: `${(profile.battleDraws / Math.max(profile.totalBattles, 1)) * 100}%` }} className="bg-gray-500" />
                </div>
                <div className="flex justify-between font-bold font-mono text-sm mt-1">
                  <span className="text-emerald-400">{profile.battleWins}</span>
                  <span className="text-gray-500">{profile.battleDraws}</span>
                  <span className="text-red-400">{profile.battleLosses}</span>
                </div>
              </div>
            </div>
          </div>

          {profile.badges && profile.badges.length > 0 && (
            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-primary" />
                {t("profile.badges")}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {profile.badges.map(badge => (
                  <div key={badge.id} className="aspect-square bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-3 text-center group relative cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all hover:-translate-y-1">
                    <Shield className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-gray-300 font-medium leading-tight px-1">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chart & History */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {/* ELO Chart */}
          <div className="bg-[#111] rounded-2xl border border-white/10 p-6 shadow-xl relative">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <Star className="w-5 h-5 text-yellow-500" />
              {t("profile.elo_history")}
            </h3>
            <div className="h-[250px] w-full">
              {profile.eloHistory && profile.eloHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...profile.eloHistory].reverse()}>
                    <XAxis dataKey="createdAt" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#eab308', fontWeight: 'bold' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: number) => [`${value} ELO`, 'Оноо']}
                    />
                    <Line type="monotone" dataKey="elo" stroke="#a855f7" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#eab308', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-xl bg-black/20">
                  <Activity className="w-12 h-12 mb-3 text-gray-600 opacity-50" />
                  {t("profile.no_data")}
                </div>
              )}
            </div>
          </div>

          {/* Recent Battles */}
          <div className="bg-[#111] rounded-2xl border border-white/10 p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-primary" />
              {t("profile.recent_matches")}
            </h3>
            
            <div className="space-y-3">
              <AnimatePresence>
                {profile.recentMatches && profile.recentMatches.length > 0 ? (
                  profile.recentMatches.map((match, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={match.battleId} 
                      className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-12 rounded-full ${match.result === 'win' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : match.result === 'loss' ? 'bg-red-500' : 'bg-gray-500'}`} />
                        <div>
                          <div className="font-bold text-white mb-1 group-hover:text-primary transition-colors">{match.problemTitle}</div>
                          <div className="text-xs text-gray-400 font-medium">vs <span className="text-gray-300">{match.opponentDisplayName}</span> <span className="text-yellow-500/80">({match.opponentElo})</span></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold font-mono text-lg ${match.result === 'win' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : match.result === 'loss' ? 'text-red-400' : 'text-gray-400'}`}>
                          {match.eloChange > 0 ? '+' : ''}{match.eloChange}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">{match.eloAfter} ELO</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-xl bg-black/20">
                    <History className="w-10 h-10 mb-3 text-gray-600 opacity-50" />
                    {t("profile.no_matches")}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
