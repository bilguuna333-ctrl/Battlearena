import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetBoss,
  useStartBossFight,
  useGetActiveBossFight,
  useBossAttack,
  useForfeitBossFight,
  getGetActiveBossFightQueryKey,
  getGetBossQueryKey,
  getGetMeQueryKey,
  BossAttackInputLanguage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
const Editor = lazy(() => import("@monaco-editor/react"));
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Heart, Zap, Crown, Coins, Star, Skull, ArrowLeft, Play, Flag, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";


const STARTERS: Record<string, string> = {
  javascript: "function solve(input) {\n  // Энд код бичнэ үү\n  return '';\n}",
  python: "def solve(input):\n    # Энд код бичнэ үү\n    return ''",
};

export default function BossFight() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: boss, isLoading: bossLoading } = useGetBoss(slug!, {
    query: { queryKey: getGetBossQueryKey(slug!), staleTime: 30000 },
  });
  const { data: active } = useGetActiveBossFight({
    query: { refetchInterval: 5000, queryKey: getGetActiveBossFightQueryKey(), staleTime: 2000 },
  });
  const start = useStartBossFight();
  const attack = useBossAttack();
  const forfeit = useForfeitBossFight();

  const [language, setLanguage] = useState<BossAttackInputLanguage>(BossAttackInputLanguage.javascript);
  const [code, setCode] = useState(STARTERS.javascript);
  const [lastResult, setLastResult] = useState<any>(null);
  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [attackEffect, setAttackEffect] = useState(false);
  const [fightResult, setFightResult] = useState<{ won: boolean; rewards?: any } | null>(null);

  const isActive = active && active.bossSlug === slug && active.state === "active";

  useEffect(() => {
    if (isActive && active?.currentProblem) {
      setCode((c) => (c === STARTERS[language] ? STARTERS[language] : c));
    }
  }, [isActive, active?.currentProblemIdx]);

  useEffect(() => {
    setCode(STARTERS[language]);
  }, [language]);

  // Auto-forfeit when leaving the page
  useEffect(() => {
    return () => {
      if (active && active.state === "active") {
        // Forfeit the fight when leaving the page
        forfeit.mutate({ id: active.id });
      }
    };
  }, [active?.id, active?.state]);

  const handleStart = () => {
    start.mutate(
      { slug: slug! },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetActiveBossFightQueryKey() });
          qc.invalidateQueries({ queryKey: getGetBossQueryKey(slug!) });
          toast({ title: "Тулаан эхэллээ!" });
        },
        onError: () => toast({ title: "Эхлүүлж чадсангүй", variant: "destructive" }),
      },
    );
  };

  const handleAttack = () => {
    if (!active) return;
    attack.mutate(
      { id: active.id, data: { language, code } },
      {
        onSuccess: (res: any) => {
          setLastResult(res);
          qc.invalidateQueries({ queryKey: getGetActiveBossFightQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          
          const fightState = res.fight?.state;
          const fightPlayerHp = res.fight?.playerHp ?? 100;
          const fightBossHp = res.fight?.bossHp ?? 0;
          
          // Check if fight ended
          if (fightState === "victory" || fightState === "defeat") {
            const won = fightState === "victory";
            setFightResult({ won, rewards: res.fight?.rewards });
            setTimeout(() => {
              setLocation("/bosses");
            }, 3000);
            return;
          }
          
          if (res.passed) {
            // Boss takes damage effect
            setAttackEffect(true);
            setTimeout(() => {
              setBossHit(true);
              setAttackEffect(false);
            }, 300);
            setTimeout(() => setBossHit(false), 800);
            toast({
              title: `Дайралт амжилттай! -${res.damageDealt} HP`,
              description: `Цуврал: ${res.fight?.combo || 1}x`,
            });
          } else {
            // Player takes damage effect
            setPlayerHit(true);
            setTimeout(() => setPlayerHit(false), 500);
            
            // Check if player lost (HP = 0)
            if (fightPlayerHp <= 0) {
              setFightResult({ won: false });
              setTimeout(() => {
                setLocation("/bosses");
              }, 3000);
              return;
            }
            
            toast({
              title: `Тест унасан (${res.passedCount}/${res.totalCount})`,
              description: `Та -${res.playerDamage} HP алдсан`,
              variant: "destructive",
            });
          }
        },
        onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
      },
    );
  };

  const handleForfeit = () => {
    if (!active) return;
    forfeit.mutate(
      { id: active.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetActiveBossFightQueryKey() });
          toast({ title: "Та бууж өгсөн" });
        },
      },
    );
  };

  if (bossLoading)
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  if (!boss) return <div className="container mx-auto p-8 text-gray-400">Бөос олдсонгүй</div>;

  if (!isActive) {
    const otherActive = active && active.state === "active";
    return (
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Button asChild variant="ghost" size="sm">
          <Link href="/bosses">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
          </Link>
        </Button>
        <Card className="border-red-500/40 bg-card/60 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                <Flame className="w-10 h-10 text-red-300" />
              </div>
              <div>
                <CardTitle className="text-3xl text-white">{boss.name}</CardTitle>
                <p className="text-orange-300 uppercase tracking-wider text-sm">{boss.title}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">{boss.description}</p>
            <div className="grid grid-cols-3 gap-3">
              <Badge variant="outline" className="border-red-500/40 text-red-300 justify-center py-2">
                <Heart className="w-3 h-3 mr-1" /> HP {boss.maxHp}
              </Badge>
              <Badge variant="outline" className="justify-center py-2">
                {boss.problems?.length ?? 0} шат
              </Badge>
              <Badge variant="outline" className="justify-center py-2">
                {boss.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm border-t border-white/10 pt-3">
              <span className="flex items-center gap-1 text-yellow-300">
                <Coins className="w-4 h-4" /> {boss.rewardCoins}
              </span>
              <span className="flex items-center gap-1 text-purple-300">
                <Star className="w-4 h-4" /> {boss.rewardXp} XP
              </span>
              {boss.rewardTitle && (
                <span className="text-pink-300 italic">"{boss.rewardTitle}"</span>
              )}
            </div>
            {otherActive ? (
              <div className="text-yellow-300 text-sm">
                Та өөр босстой тулалдаж байна.{" "}
                <Link href={`/bosses/${active!.bossSlug}`} className="underline">
                  Тийш очих
                </Link>
              </div>
            ) : (
              <Button
                onClick={handleStart}
                disabled={start.isPending}
                className="w-full bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-100 text-lg py-6"
                data-testid="button-start-fight"
              >
                <Play className="w-5 h-5 mr-2" /> {t("boss.start")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const bossPct = (active.bossHp / active.maxHp) * 100;
  const playerPct = active.playerHp;
  const problem = active.currentProblem;

  return (
    <div className="container mx-auto px-4 py-4 space-y-3">
      {/* Fight Result Modal */}
      <AnimatePresence>
        {fightResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`p-8 rounded-2xl border-2 text-center ${
                fightResult.won
                  ? "bg-gradient-to-b from-emerald-900/90 to-emerald-950/90 border-emerald-500"
                  : "bg-gradient-to-b from-red-900/90 to-red-950/90 border-red-500"
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-8xl mb-4"
              >
                {fightResult.won ? "🏆" : "💀"}
              </motion.div>
              <h2 className={`text-4xl font-black mb-2 ${fightResult.won ? "text-emerald-300" : "text-red-300"}`}>
                {fightResult.won ? "ЯЛАЛТ!" : "ЯЛАГДАЛ"}
              </h2>
              <p className="text-gray-300 mb-4">
                {fightResult.won ? "Та бөсийг ялсан!" : "Та ялагдсан..."}
              </p>
              {fightResult.won && fightResult.rewards && (
                <div className="flex items-center justify-center gap-4 text-lg">
                  <span className="text-yellow-300 flex items-center gap-1">
                    <Coins className="w-5 h-5" /> +{fightResult.rewards.coins || 0}
                  </span>
                  <span className="text-purple-300 flex items-center gap-1">
                    <Star className="w-5 h-5" /> +{fightResult.rewards.xp || 0} XP
                  </span>
                </div>
              )}
              <p className="text-gray-500 text-sm mt-4">3 секундын дараа шилжих болно...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Battle Arena with 2D Characters */}
      <Card className="border-red-500/40 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-[0_0_25px_rgba(239,68,68,0.25)] overflow-hidden">
        <CardContent className="py-4">
          {/* HP Bars */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-red-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 animate-pulse" /> {active.bossName}
                </span>
                <span className="text-xs text-gray-400">
                  Шат {active.currentProblemIdx + 1}/{active.totalProblems}
                </span>
              </div>
              <div className="relative h-5 bg-gray-800 rounded-full overflow-hidden border-2 border-red-500/50">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-400"
                  initial={{ width: `${bossPct}%` }}
                  animate={{ width: `${bossPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                  {active.bossHp} / {active.maxHp}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-cyan-300 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> {t("boss.player_hp")}
                </span>
                <span className="text-xs text-yellow-300 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {t("boss.combo")}: {active.combo}x
                </span>
              </div>
              <div className="relative h-5 bg-gray-800 rounded-full overflow-hidden border-2 border-cyan-500/50">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${
                    playerPct > 50 ? "bg-gradient-to-r from-green-600 to-emerald-400" : playerPct > 25 ? "bg-gradient-to-r from-yellow-600 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400"
                  }`}
                  initial={{ width: `${playerPct}%` }}
                  animate={{ width: `${Math.max(0, playerPct)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                  {active.playerHp} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Battle Arena */}
          <div className="relative h-48 rounded-xl border border-purple-500/30 overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900/50 to-slate-950">
            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-stone-700 to-transparent" />
            
            {/* Attack Effect */}
            <AnimatePresence>
              {attackEffect && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-1/2 left-1/4 right-1/4 h-3 bg-gradient-to-r from-cyan-400 via-yellow-400 to-orange-500 rounded-full z-30"
                  style={{ boxShadow: "0 0 30px rgba(255,200,0,0.8)" }}
                />
              )}
            </AnimatePresence>

            {/* Player (Left) */}
            <motion.div
              className="absolute left-12 bottom-14 z-20 text-center"
              animate={playerHit ? { x: [0, -15, 15, 0] } : { y: [0, -4, 0] }}
              transition={playerHit ? { duration: 0.3 } : { duration: 1.5, repeat: Infinity }}
            >
              {playerHit && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-500 rounded-full blur-xl"
                  style={{ width: 100, height: 100, left: -10, top: -10 }}
                />
              )}
              <motion.div 
                className="text-7xl"
                animate={attackEffect ? { x: [0, 30, 0], rotate: [0, 15, 0] } : {}}
                transition={{ duration: 0.25 }}
                style={{ filter: playerHit ? "brightness(2) sepia(1) hue-rotate(-50deg)" : "drop-shadow(0 4px 8px rgba(0,200,255,0.5))" }}
              >
                🧙‍♂️
              </motion.div>
              <p className="text-cyan-300 text-sm font-bold mt-1">Тоглогч</p>
            </motion.div>

            {/* Boss (Right) */}
            <motion.div
              className="absolute right-12 bottom-14 z-20 text-center"
              animate={bossHit ? { x: [0, 20, -20, 10, 0], rotate: [0, -5, 5, 0] } : { y: [0, -6, 0] }}
              transition={bossHit ? { duration: 0.4 } : { duration: 2, repeat: Infinity }}
            >
              <AnimatePresence>
                {bossHit && (
                  <>
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 0, scale: 2 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-500 rounded-full blur-2xl"
                      style={{ width: 120, height: 120, left: -15, top: -15 }}
                    />
                    <motion.div
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -50 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl font-black text-red-500 z-30"
                      style={{ textShadow: "0 0 15px red" }}
                    >
                      -{lastResult?.damageDealt || 0}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              <motion.div 
                className="text-8xl"
                style={{ filter: bossHit ? "brightness(2) sepia(1) saturate(2)" : "drop-shadow(0 4px 12px rgba(255,50,0,0.6))" }}
              >
                👹
              </motion.div>
              <p className="text-red-400 text-sm font-bold mt-1">{active.bossName}</p>
            </motion.div>

            {/* VS */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-4xl font-black text-yellow-500"
                style={{ textShadow: "0 0 20px rgba(255,150,0,0.8)" }}
              >
                ⚔️
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {problem ? (
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="border-white/10 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <span>{problem.title}</span>
                <Badge variant="outline">{problem.difficulty}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-3 text-sm">
              <div>
                <h4 className="text-purple-300 font-semibold mb-1">Тайлбар</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{problem.statement}</p>
              </div>
              <div>
                <h4 className="text-purple-300 font-semibold mb-1">Оролт</h4>
                <p className="text-gray-300">{problem.inputDescription}</p>
              </div>
              <div>
                <h4 className="text-purple-300 font-semibold mb-1">Гаралт</h4>
                <p className="text-gray-300">{problem.outputDescription}</p>
              </div>
              {(problem.examples ?? []).map((ex: any, i: number) => (
                <div key={i} className="border-t border-white/10 pt-2">
                  <h4 className="text-cyan-300 text-xs font-semibold">Жишээ {i + 1}</h4>
                  <pre className="bg-black/40 p-2 rounded text-xs mt-1 text-green-300">{ex.input}</pre>
                  <pre className="bg-black/40 p-2 rounded text-xs mt-1 text-yellow-300">{ex.output}</pre>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <span>Код бичих</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as BossAttackInputLanguage)}
                  className="bg-background border border-white/10 rounded px-2 py-1 text-sm"
                  data-testid="select-language"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="border border-white/10 rounded overflow-hidden">
                <Suspense fallback={<div className="h-[400px] bg-[#1e1e1e] flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" /></div>}>
                  <Editor
                    height="400px"
                    language={language}
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    theme="vs-dark"
                    options={{ fontSize: 13, minimap: { enabled: false } }}
                    loading={<div className="h-[400px] bg-[#1e1e1e] flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" /></div>}
                  />
                </Suspense>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAttack}
                  disabled={attack.isPending}
                  className="flex-1 bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-100"
                  data-testid="button-attack"
                >
                  <Flame className="w-4 h-4 mr-1" /> {t("boss.attack")}
                </Button>
                <Button
                  onClick={handleForfeit}
                  disabled={forfeit.isPending}
                  variant="outline"
                  data-testid="button-forfeit"
                >
                  <Flag className="w-4 h-4 mr-1" /> {t("boss.forfeit")}
                </Button>
              </div>
              {lastResult && (
                <div
                  className={`p-2 rounded text-sm border ${
                    lastResult.passed
                      ? "bg-green-500/10 border-green-500/40 text-green-300"
                      : "bg-red-500/10 border-red-500/40 text-red-300"
                  }`}
                >
                  {lastResult.passed
                    ? `Амжилттай! Босс -${lastResult.damageDealt} HP, цуврал ${lastResult.fight?.combo || 1}x`
                    : `Тест ${lastResult.passedCount}/${lastResult.totalCount} • Та -${lastResult.playerDamage} HP`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : active.state !== "active" ? (
        <Card className={`${active.result === "victory" ? "border-green-500/40" : "border-red-500/40"} bg-card/60`}>
          <CardContent className="py-12 text-center space-y-4">
            {active.result === "victory" ? (
              <>
                <Crown className="w-20 h-20 mx-auto text-yellow-300 animate-pulse" />
                <h2 className="text-3xl font-bold text-white">Та ялсан!</h2>
                <p className="text-gray-300">
                  +{active.rewardCoins} зоос, +{active.rewardXp} XP
                  {active.rewardTitle && `, "${active.rewardTitle}" цол`}
                </p>
              </>
            ) : (
              <>
                <Skull className="w-20 h-20 mx-auto text-red-400" />
                <h2 className="text-3xl font-bold text-white">Бууж өгсөн</h2>
              </>
            )}
            <Button asChild>
              <Link href="/bosses">{t("common.back")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
