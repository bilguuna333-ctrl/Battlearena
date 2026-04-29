import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, X, Search, ShieldAlert, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGetMe, useGetQueueStatus, useJoinQueue, useCancelQueue, useAcceptMatch, getGetMeQueryKey, getGetQueueStatusQueryKey } from "@workspace/api-client-react";

export default function BattleQueue() {
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (!token && !user) setLocation("/login");
  }, [token, user, setLocation]);

  const [isInQueue, setIsInQueue] = useState(false);

  const { data: queueStatus, refetch } = useGetQueueStatus({
    query: { refetchInterval: 1000, enabled: !!token, queryKey: getGetQueueStatusQueryKey() }
  });

  const joinMutation = useJoinQueue();
  const cancelMutation = useCancelQueue();
  const acceptMutation = useAcceptMatch();

  useEffect(() => {
    if (queueStatus?.state === "searching") setIsInQueue(true);
    if (queueStatus?.state === "in_battle" && queueStatus.battleId) {
      setLocation(`/battle/${queueStatus.battleId}`);
    }
  }, [queueStatus, setLocation]);

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: () => setIsInQueue(true),
      onError: (err) => toast.error(err.message || "Алдаа гарлаа")
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(undefined, {
      onSuccess: () => setIsInQueue(false),
      onError: (err) => toast.error(err.message || "Алдаа гарлаа")
    });
  };

  const handleAccept = () => {
    if (queueStatus?.matchId) {
      acceptMutation.mutate({ data: { matchId: queueStatus.matchId, accept: true } }, {
        onError: (err) => toast.error(err.message || "Алдаа гарлаа")
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <div className="max-w-md w-full relative z-10 text-center">
        {!isInQueue && queueStatus?.state !== "match_found" && queueStatus?.state !== "accepted" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-card/50 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] mb-6">
              <Sword className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Тулааны талбар</h1>
            <p className="text-muted-foreground mb-8">Ижил түвшний өрсөлдөгчтэй 1v1 тулаанд орж чансаагаа ахиулна уу.</p>
            
            <Button 
              size="lg" 
              className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              onClick={handleJoin}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? "Уншиж байна..." : "Тулаан хайх"}
            </Button>
          </motion.div>
        ) : queueStatus?.state === "searching" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl bg-card/50 backdrop-blur-xl border border-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden"
          >
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 border-t border-primary/30 origin-bottom animate-spin" style={{ animationDuration: '3s' }} />
            
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center animate-pulse mb-6 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Өрсөлдөгч хайж байна...</h2>
              <div className="text-4xl font-mono font-bold text-primary mb-6 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                {formatTime(queueStatus.secondsInQueue)}
              </div>
              
              <div className="bg-black/40 rounded-lg p-4 mb-8 border border-white/5">
                <div className="text-sm text-muted-foreground mb-1">Хайлтын ELO цар хүрээ</div>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-medium">
                  <Zap className="w-4 h-4" />
                  ±{queueStatus.searchRange} ELO
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full h-12"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <X className="w-5 h-5 mr-2" /> Цуцлах
              </Button>
            </div>
          </motion.div>
        ) : (queueStatus?.state === "match_found" || queueStatus?.state === "accepted") ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="p-8 rounded-3xl bg-card border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Sword className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold mb-6 text-emerald-400">Өрсөлдөгч олдлоо!</h2>
              
              {queueStatus.opponent && (
                <div className="bg-background/50 rounded-xl p-4 mb-8 border border-white/10 flex items-center gap-4 text-left">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${queueStatus.opponent.avatarSeed || queueStatus.opponent.username}`} alt="Opponent" className="w-16 h-16 rounded bg-white/5" />
                  <div>
                    <div className="font-bold text-lg">{queueStatus.opponent.displayName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{queueStatus.opponent.rank}</span>
                      <span className="flex items-center gap-1 text-yellow-500"><Zap className="w-3 h-3" />{queueStatus.opponent.eloRating}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {queueStatus.state === "match_found" ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-6 text-orange-400">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span>Хүлээн авахыг хүлээж байна...</span>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      size="lg" 
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      onClick={handleAccept}
                      disabled={acceptMutation.isPending}
                    >
                      Хүлээн авах
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="flex-1 h-14 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={handleCancel}
                    >
                      Татгалзах
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-xl font-bold text-emerald-400 animate-pulse">
                  Тоглолт эхлэхэд бэлтгэж байна...
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
