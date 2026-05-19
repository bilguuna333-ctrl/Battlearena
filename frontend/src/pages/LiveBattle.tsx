import {
  useGetBattle,
  useSubmitBattleSolution,
  useGetMe,
  getGetMeQueryKey,
  getGetBattleQueryKey,
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Trophy, Zap, XCircle, ArrowLeft, Home as HomeIcon, Swords, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getRankColor } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export default function LiveBattle() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const { data: battle, isLoading } = useGetBattle(id || "", {
    query: { enabled: !!id && !!token, refetchInterval: 3000, queryKey: getGetBattleQueryKey(id || "") }
  });

  const submitMutation = useSubmitBattleSolution();

  const [language, setLanguage] = useState<
    "javascript" | "typescript" | "python" | "cpp"
  >("javascript");
  const [code, setCode] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (battle?.problem && !code) {
      setCode((battle.problem.starterCode as any)[language] || "");
    }
  }, [battle?.problem, language]);

  useEffect(() => {
    if (!battle) return;
    if (battle.state === "finished") return;

    const start = new Date(battle.startedAt).getTime();
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [battle]);

// Auto-redirect to problems after battle ends
  useEffect(() => {
    if (battle?.state === "finished") {
      const timer = setTimeout(() => {
        setLocation("/problems");
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [battle?.state]);

  // Real-time Socket.io connection
  useEffect(() => {
    if (!id) return undefined;
    
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", `battle:${id}`);
    });

// Real-time battle progress update
    socket.on("battle_progress", (data) => {
      queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id) });
      if (data.userId !== user?.id) {
        toast.info(`Өрсөлдөгч ${data.passedCount}/${data.totalCount} тест тэнцлээ`);
      }
    });

    // Real-time battle finished
    socket.on("battle_finished", () => {
      queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, user?.id]);

  const handleForfeit = async () => {
    if (!window.confirm("Та тулааныг орхиж бууж өгөхдөө итгэлтэй байна уу? Орхивол таныг хожигдсонд тооцож, ELO оноо хасагдах болно.")) {
      return;
    }
    try {
      await apiRequest<any>(`/api/battles/${id}/forfeit`, {
        method: "POST",
      });
      toast.success("Тулааныг цуцалж, бууж өглөө.");
      queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id || "") });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err: any) {
      toast.error(err?.message || "Бууж өгөхөд алдаа гарлаа.");
    }
  };

  const handleSubmit = () => {
    if (!battle || !id) return;
    submitMutation.mutate({
      id,
      data: {
        problemSlug: battle.problem.slug,
        language: language as any,
        code: code
      }
    }, {
      onSuccess: (res) => {
        if (res.status === "passed") {
          toast.success("Амжилттай! Бүх тестүүд тэнцлээ.");
        } else {
          toast.error("Алдаатай байна. Тестүүд унасан.");
        }
      }
    });
  };

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !battle || !user) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="flex-1 flex h-screen overflow-hidden relative">
      {/* Left Column: Code Editor */}
      <div className="w-1/2 flex flex-col border-r border-white/10">
        {/* Header */}
        <div className="h-12 border-b border-white/10 bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setLocation("/battle")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
              <SelectTrigger className="w-[120px] h-8 bg-transparent border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-950/60 border border-red-500/30 text-red-400 hover:bg-red-900/60 transition-colors"
              onClick={handleForfeit}
              disabled={battle.state === "finished"}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Бууж өгөх
            </Button>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={submitMutation.isPending || battle.state === "finished"}
            >
              {submitMutation.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
              Кодоо илгээх
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(val: string | undefined) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono',
              padding: { top: 16 },
              readOnly: battle.state === "finished"
            }}
          />
        </div>
      </div>

      {/* Right Column: Problem + Players */}
      <div className="w-1/2 flex flex-col bg-background overflow-hidden">
        {/* Timer + Players */}
        <div className="border-b border-white/10 bg-card p-4">
          <div className="text-center mb-4">
            <div className="text-4xl font-mono font-bold text-white">
              {battle.state === "finished" ? formatTime(battle.durationSeconds) : formatTime(timeElapsed)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2">
                <img src={battle.you.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.you.avatarSeed}` : ""} alt="You" className="w-8 h-8 rounded" />
                <div>
                  <div className="font-bold text-xs">{battle.you.displayName}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className={getRankColor(battle.you.rank)}>{battle.you.rank}</span>
                    <Zap className="w-2.5 h-2.5 text-yellow-500" /> {battle.you.eloRating}
                  </div>
                </div>
              </div>
              <div className="font-bold text-emerald-400 text-lg">{battle.you.passedTests}/{battle.you.totalTests}</div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2">
                <img src={battle.opponent.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.opponent.avatarSeed}` : ""} alt="Opponent" className="w-8 h-8 rounded" />
                <div>
                  <div className="font-bold text-xs text-red-400">{battle.opponent.displayName}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className={getRankColor(battle.opponent.rank)}>{battle.opponent.rank}</span>
                    <Zap className="w-2.5 h-2.5 text-yellow-500" /> {battle.opponent.eloRating}
                  </div>
                </div>
              </div>
              <div className="font-bold text-emerald-400 text-lg">{battle.opponent.passedTests}/{battle.opponent.totalTests}</div>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <div className="flex-1 overflow-y-auto p-4">
          {battle.problem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sword className="w-5 h-5 text-primary" />
                  {battle.problem.title}
                </h2>
                <span className={`text-xs px-2 py-1 rounded ${
                  battle.problem.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  battle.problem.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {battle.problem.difficulty === 'easy' ? 'Хялбар' :
                   battle.problem.difficulty === 'medium' ? 'Дунд' : 'Хэцүү'}
                </span>
              </div>

              <div className="text-gray-300 whitespace-pre-wrap">{battle.problem.statement}</div>

              {battle.problem.inputDescription && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">Оролт</h3>
                  <p className="text-sm text-gray-400">{battle.problem.inputDescription}</p>
                </div>
              )}
              {battle.problem.outputDescription && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">Гаралт</h3>
                  <p className="text-sm text-gray-400">{battle.problem.outputDescription}</p>
                </div>
              )}

              {battle.problem.constraints && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">Хязгаарлалт</h3>
                  <p className="text-sm text-gray-400">{battle.problem.constraints}</p>
                </div>
              )}

              {battle.problem.examples && (battle.problem.examples as any[]).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-2">Жишээ</h3>
                  <div className="space-y-3">
                    {(battle.problem.examples as any[]).map((ex: any, i: number) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Оролт:</span>
                            <pre className="text-xs bg-black/50 p-2 rounded font-mono text-green-400 overflow-x-auto">{ex.input}</pre>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Гаралт:</span>
                            <pre className="text-xs bg-black/50 p-2 rounded font-mono text-blue-400 overflow-x-auto">{ex.output}</pre>
                          </div>
                        </div>
                        {ex.explanation && (
                          <p className="text-xs text-gray-500 mt-2 italic">{ex.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen finished overlay */}
      <AnimatePresence>
        {battle.state === "finished" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-card border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
            >
              {battle.result === "win" && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                    <Trophy className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-emerald-400 mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                    {t("battle.you_won")}
                  </h2>
                </>
              )}
              {battle.result === "loss" && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-red-400 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    {t("battle.you_lost")}
                  </h2>
                </>
              )}
              {battle.result === "draw" && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-gray-500/20 flex items-center justify-center mb-4 border border-gray-500/50">
                    <Sword className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-400 mb-2">
                    {t("battle.draw")}
                  </h2>
                </>
              )}

              <div className="text-lg text-muted-foreground mb-6">
                {t("battle.duration")}: {formatTime(battle.durationSeconds)}
              </div>

              <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 flex items-center justify-center gap-4">
                <span className="text-base font-bold">ELO</span>
                <div
                  className={`text-3xl font-bold font-mono ${
                    battle.eloChange && battle.eloChange > 0
                      ? "text-emerald-400"
                      : battle.eloChange && battle.eloChange < 0
                        ? "text-red-400"
                        : "text-gray-400"
                  }`}
                >
                  {battle.eloChange && battle.eloChange > 0 ? "+" : ""}
                  {battle.eloChange ?? 0}
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-4">5 секундын дараа дасгал руу шилжих болно...</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setLocation("/battle")}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  {t("battle.queue")}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => setLocation("/problems")}
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Дасгал
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() =>
                    setLocation(`/profile/${user.username}`)
                  }
                >
                  {t("nav.profile")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
