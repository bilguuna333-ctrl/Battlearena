import { useGetCurrentSeason, useListSeasons } from "@workspace/api-client-react";
import { Crown, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Seasons() {
  const { data: currentSeason, isLoading: loadingCurrent } = useGetCurrentSeason();
  const { data: seasons, isLoading: loadingSeasons } = useListSeasons();

  if (loadingCurrent || loadingSeasons) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 border border-primary/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Улирлууд</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          CodeSteppe-ийн түүхэн улирлууд болон аваргуудын жагсаалт. Шинэ улирал бүрт ELO дахин шинэчлэгдэж, шинэ тэмцэл эхэлдэг.
        </p>
      </div>

      {currentSeason && (
        <div className="mb-12 relative rounded-3xl border border-primary/50 bg-card overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50" />
          <div className="relative z-10 p-8 md:p-12 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold mb-6 uppercase tracking-wider">
              Одоо үргэлжилж буй
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{currentSeason.name}</h2>
            <div className="flex items-center gap-6 text-muted-foreground mb-8">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Эхэлсэн: {new Date(currentSeason.startedAt).toLocaleDateString('mn-MN')}</div>
              <div className="flex items-center gap-2 text-primary font-medium">Дуусах: {new Date(currentSeason.endsAt).toLocaleDateString('mn-MN')}</div>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-6">Өнгөрсөн улирлууд</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {seasons?.filter(s => !s.isActive).map((season, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={season.id} 
            className="bg-card border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-2xl font-bold mb-1">{season.name}</h4>
                <div className="text-sm text-muted-foreground">
                  {new Date(season.startedAt).getFullYear()}/{new Date(season.startedAt).getMonth() + 1} - {new Date(season.endsAt).getFullYear()}/{new Date(season.endsAt).getMonth() + 1}
                </div>
              </div>
            </div>
            
            {season.topPlayer ? (
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-yellow-500" /> Улирлын аварга
                </div>
                <Link href={`/profile/${season.topPlayer.username}`} className="flex items-center gap-3 group">
                    <img src={(season.topPlayer as any).avatarUrl || (season.topPlayer.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${season.topPlayer.avatarSeed}` : "")} alt={season.topPlayer.username} className="w-12 h-12 rounded bg-black/40 border border-white/10 group-hover:border-primary/50 transition-colors" />
                    <div>
                      <div className="font-bold text-lg group-hover:text-primary transition-colors">{season.topPlayer.displayName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        @{season.topPlayer.username} • <span className="text-yellow-500 font-mono font-bold">{season.topPlayer.eloRating} ELO</span>
                      </div>
                    </div>
                  </Link>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center text-sm text-muted-foreground py-8">
                Аварга тодроогүй байна
              </div>
            )}
          </motion.div>
        ))}
        {(!seasons || seasons.filter(s => !s.isActive).length === 0) && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-white/5 rounded-2xl">
            Өнгөрсөн улирлын мэдээлэл алга байна.
          </div>
        )}
      </div>
    </div>
  );
}
