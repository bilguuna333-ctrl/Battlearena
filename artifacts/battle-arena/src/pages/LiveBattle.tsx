import {
  useGetBattle,
  useSubmitBattleSolution,
  useSendBattleChat,
  useGetMe,
  getGetMeQueryKey,
  getGetBattleQueryKey,
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Trophy, Zap, Clock, Cpu, Play, CheckCircle2, XCircle, Send, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getRankColor, getRankBg } from "@/lib/utils";

export default function LiveBattle() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  const { data: battle, isLoading } = useGetBattle(id || "", {
    query: { enabled: !!id && !!token, refetchInterval: 1500, queryKey: getGetBattleQueryKey(id || "") }
  });

  const submitMutation = useSubmitBattleSolution();
  const chatMutation = useSendBattleChat();

  const [language, setLanguage] = useState<"javascript" | "python">("javascript");
  const [code, setCode] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (battle?.problem && !code) {
      setCode(battle.problem.starterCode[language] || "");
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [battle?.chat]);

  const handleSubmit = () => {
    if (!battle || !id) return;
    submitMutation.mutate({
      id,
      data: {
        problemSlug: battle.problem.slug,
        language: language,
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

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !id) return;
    chatMutation.mutate({ id, data: { message: chatMessage } }, {
      onSuccess: () => setChatMessage("")
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
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Column: Problem & Editor */}
      <div className="w-2/3 flex flex-col border-r border-white/10">
        <div className="h-14 border-b border-white/10 bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="font-bold text-lg flex items-center gap-2">
            <Sword className="w-5 h-5 text-primary" />
            {battle.problem.title}
          </div>
          <div className="flex items-center gap-4">
            <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
              <SelectTrigger className="w-[130px] h-8 bg-transparent border-white/10">
                <SelectValue placeholder="Хэл сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              onClick={handleSubmit}
              disabled={submitMutation.isPending || battle.state === "finished"}
            >
              {submitMutation.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
              Кодоо илгээх
            </Button>
          </div>
        </div>

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

      {/* Right Column: Status & Opponent & Chat */}
      <div className="w-1/3 flex flex-col bg-background relative overflow-hidden">
        {/* Timer */}
        <div className="h-16 flex items-center justify-center border-b border-white/10 bg-card/50">
          <div className="text-3xl font-mono font-bold tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            {battle.state === "finished" ? formatTime(battle.durationSeconds) : formatTime(timeElapsed)}
          </div>
        </div>

        {/* Players Info */}
        <div className="p-4 border-b border-white/10 bg-card flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.you.avatarSeed || battle.you.username}`} alt="You" className="w-10 h-10 rounded bg-white/10" />
              <div>
                <div className="font-bold text-sm">Та ({battle.you.displayName})</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={getRankColor(battle.you.rank)}>{battle.you.rank}</span>
                  <Zap className="w-3 h-3 text-yellow-500" /> {battle.you.eloRating}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-400">{battle.you.passedTests} / {battle.you.totalTests}</div>
              <div className="text-xs text-muted-foreground">Тэнцсэн</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.opponent.avatarSeed || battle.opponent.username}`} alt="Opponent" className="w-10 h-10 rounded bg-white/10" />
              <div>
                <div className="font-bold text-sm text-red-400">{battle.opponent.displayName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className={getRankColor(battle.opponent.rank)}>{battle.opponent.rank}</span>
                  <Zap className="w-3 h-3 text-yellow-500" /> {battle.opponent.eloRating}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-400">{battle.opponent.passedTests} / {battle.opponent.totalTests}</div>
              <div className="text-xs text-muted-foreground">Тэнцсэн</div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-card/30 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {battle.chat.map((msg, i) => {
              const isMe = msg.username === user.username;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-muted-foreground mb-1 px-1">{msg.displayName}</span>
                  <div className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-secondary-foreground rounded-tl-sm'}`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-card flex gap-2">
            <Input 
              placeholder="Чат бичих..." 
              value={chatMessage} 
              onChange={e => setChatMessage(e.target.value)}
              className="bg-background/50 border-white/10"
              disabled={chatMutation.isPending}
            />
            <Button type="submit" size="icon" disabled={chatMutation.isPending || !chatMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Finished Overlay */}
        <AnimatePresence>
          {battle.state === "finished" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm bg-card border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
              >
                {battle.result === "win" && (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <Trophy className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-4xl font-bold text-emerald-400 mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">Ялалт!</h2>
                  </>
                )}
                {battle.result === "loss" && (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-4xl font-bold text-red-400 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Ялагдал</h2>
                  </>
                )}
                {battle.result === "draw" && (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-gray-500/20 flex items-center justify-center mb-4 border border-gray-500/50">
                      <Sword className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-4xl font-bold text-gray-400 mb-2">Тэнцээ</h2>
                  </>
                )}

                <div className="text-lg text-muted-foreground mb-6">
                  Үргэлжилсэн хугацаа: {formatTime(battle.durationSeconds)}
                </div>

                <div className="bg-black/40 rounded-xl p-4 mb-8 border border-white/5 flex items-center justify-center gap-4">
                  <span className="text-xl font-bold">ELO нэмэгдлээ</span>
                  <div className={`text-3xl font-bold font-mono ${battle.eloChange && battle.eloChange > 0 ? 'text-emerald-400' : battle.eloChange && battle.eloChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {battle.eloChange && battle.eloChange > 0 ? '+' : ''}{battle.eloChange}
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => setLocation("/")}>
                  Буцах
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
