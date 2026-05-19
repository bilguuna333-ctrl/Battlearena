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
import { apiRequest } from "@/lib/api";


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
  const [loadingProblem, setLoadingProblem] = useState(false);

  const isActive = active && active.bossSlug === slug && active.state === "active";

  useEffect(() => {
    if (isActive && active?.currentProblem) {
      const p = active.currentProblem;
      const starterCode = p.starterCode?.[language] || STARTERS[language];
      setCode(starterCode);
    }
  }, [isActive, active?.currentProblem?.id, language]);

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

  const selectSkill = async (idx: number) => {
    if (loadingProblem) return;
    setLoadingProblem(true);
    try {
      await apiRequest<any>(`/api/boss-fights/${active.id}/select-problem`, {
        method: "POST",
        body: JSON.stringify({ problemIdx: idx }),
      });
      qc.invalidateQueries({ queryKey: getGetActiveBossFightQueryKey() });
      toast({
        title: `${SHADOW_SKILLS[idx].name} сонгогдлоо!`,
        description: "Одоо дасгалыг бодож сүүдрийн эзнийг дайрна уу.",
      });
    } catch (err: any) {
      toast({
        title: "Алдаа гарлаа",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingProblem(false);
    }
  };

  if (isActive && slug === "code-shadow-lord") {
    return (
      <ShadowLordArena
        active={active}
        boss={boss}
        t={t}
        language={language}
        setLanguage={setLanguage}
        code={code}
        setCode={setCode}
        handleAttack={handleAttack}
        handleForfeit={handleForfeit}
        attackPending={attack.isPending}
        forfeitPending={forfeit.isPending}
        lastResult={lastResult}
        bossHit={bossHit}
        playerHit={playerHit}
        attackEffect={attackEffect}
        fightResult={fightResult}
        bossPct={bossPct}
        playerPct={playerPct}
        selectSkill={selectSkill}
        loadingProblem={loadingProblem}
      />
    );
  }

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

const SHADOW_SKILLS = [
  {
    name: "Сүүдрийн Довтолгоо",
    nameEn: "Shadow Strike",
    difficulty: "Хялбар",
    damage: 100,
    penalty: 15,
    description: "Хялбар бодлоготой довтолгоо. Амжилттай бол 100 хохирол учруулах ба амжилтгүй бол 15 хүртэлх HP алдана.",
    icon: "🗡️",
    color: "from-indigo-650 to-purple-650",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.5)]",
    border: "border-indigo-500/50",
  },
  {
    name: "Сүүдрийн Урхи",
    nameEn: "Shadow Trap",
    difficulty: "Дунд",
    damage: 250,
    penalty: 35,
    description: "Дунд зэргийн бодлоготой урхи. Амжилттай бол 250 хохирол учруулах ба амжилтгүй бол 35 хүртэлх HP алдана.",
    icon: "🕸️",
    color: "from-amber-650 to-orange-650",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    border: "border-amber-500/50",
  },
  {
    name: "Сүүдрийн Сүйрэл",
    nameEn: "Shadow Ruin",
    difficulty: "Хэцүү",
    damage: 500,
    penalty: 60,
    description: "Хүнд түвшний сүйрлийн дайралт. Амжилттай бол 500 хохирол учруулах ба амжилтгүй бол 60 хүртэлх HP алдана.",
    icon: "☄️",
    color: "from-red-650 to-rose-750",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    border: "border-red-500/50",
  },
];

interface ShadowLordArenaProps {
  active: any;
  boss: any;
  t: any;
  language: BossAttackInputLanguage;
  setLanguage: (lang: BossAttackInputLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  handleAttack: () => void;
  handleForfeit: () => void;
  attackPending: boolean;
  forfeitPending: boolean;
  lastResult: any;
  bossHit: boolean;
  playerHit: boolean;
  attackEffect: boolean;
  fightResult: any;
  bossPct: number;
  playerPct: number;
  selectSkill: (idx: number) => Promise<void>;
  loadingProblem: boolean;
}

function ShadowLordArena({
  active,
  boss,
  t,
  language,
  setLanguage,
  code,
  setCode,
  handleAttack,
  handleForfeit,
  attackPending,
  forfeitPending,
  lastResult,
  bossHit,
  playerHit,
  attackEffect,
  fightResult,
  bossPct,
  playerPct,
  selectSkill,
  loadingProblem,
}: ShadowLordArenaProps) {
  const problem = active.currentProblem;

  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 40 + 20}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 8 + 6}s`,
    }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-4 space-y-4 relative">
      <style>{`
        @keyframes floatShadow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes pulseRune {
          0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 5px rgba(168,85,247,0.4)); }
          50% { opacity: 0.9; filter: drop-shadow(0 0 20px rgba(244,63,94,0.8)); }
        }
        @keyframes laserStrike {
          0% { left: 15%; width: 0%; opacity: 0; }
          40% { left: 15%; width: 70%; opacity: 1; }
          60% { left: 15%; width: 70%; opacity: 1; }
          100% { left: 85%; width: 0%; opacity: 0; }
        }
        @keyframes shadowStrike {
          0% { right: 15%; width: 0%; opacity: 0; }
          40% { right: 15%; width: 70%; opacity: 1; }
          60% { right: 15%; width: 70%; opacity: 1; }
          100% { right: 85%; width: 0%; opacity: 0; }
        }
        .rune-glow {
          animation: pulseRune 3s infinite ease-in-out;
        }
        .boss-hover {
          animation: floatShadow 4s infinite ease-in-out;
        }
      `}</style>

      {/* Fight Result Modal */}
      <AnimatePresence>
        {fightResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className={`p-10 rounded-3xl border border-purple-500/30 text-center max-w-md w-full mx-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] ${
                fightResult.won
                  ? "bg-slate-950 border-emerald-500/80"
                  : "bg-slate-950 border-red-500/80"
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-9xl mb-6 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {fightResult.won ? "👑" : "💀"}
              </motion.div>
              <h2 className={`text-4xl font-extrabold mb-3 tracking-wider ${fightResult.won ? "text-emerald-400 font-black" : "text-red-400 font-black"}`}>
                {fightResult.won ? "ЯЛАЛТ!" : "ЯЛАГДАЛ"}
              </h2>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {fightResult.won 
                  ? "Та Сүүдрийн Эзнийг дарж чадлаа! Хүч чадал тань домог болон үлдэх болно." 
                  : "Сүүдрийн хүч таныг эзэмдлээ... Гэхдээ кодын зам үүгээр дуусахгүй."}
              </p>
              {fightResult.won && fightResult.rewards && (
                <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-around text-xl font-bold mb-6">
                  <span className="text-yellow-400 flex items-center gap-2">
                    <Coins className="w-6 h-6" /> +{fightResult.rewards.coins || 800}
                  </span>
                  <span className="text-purple-400 flex items-center gap-2">
                    <Star className="w-6 h-6" /> +{fightResult.rewards.xp || 1500} XP
                  </span>
                </div>
              )}
              {fightResult.won && (
                <div className="text-pink-400 italic text-base mb-6 font-bold">
                  Шинэ цол олгогдлоо: "Сүүдрийг Дарагч" 🎖️
                </div>
              )}
              <p className="text-gray-500 text-sm">3 секундын дараа шилжих болно...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arena Panel */}
      <Card className="relative overflow-hidden border-purple-500/30 bg-slate-950 shadow-[0_0_35px_rgba(168,85,247,0.15)] rounded-2xl">
        {/* Floating Particles in Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="shadow-particle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        <CardContent className="py-6 relative z-10">
          {/* Top Status & HP Indicators */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Boss Side */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-red-400 flex items-center gap-2 tracking-wide text-lg">
                  <Skull className="w-5 h-5 text-red-500 animate-bounce" /> {active.bossName}
                </span>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-2 py-0.5">
                  Тусгай Босс
                </Badge>
              </div>
              <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border-2 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-800 via-red-600 to-rose-500"
                  initial={{ width: `${bossPct}%` }}
                  animate={{ width: `${bossPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {active.bossHp} / {active.maxHp} HP
                </span>
              </div>
            </div>

            {/* Player Side */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-cyan-400 flex items-center gap-2 tracking-wide text-lg">
                  <Heart className="w-5 h-5 text-cyan-400 animate-pulse" /> Тоглогч
                </span>
                <span className="text-xs text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 animate-spin" /> {t("boss.combo")}: {active.combo}x
                </span>
              </div>
              <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <motion.div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${
                    playerPct > 50 
                      ? "from-cyan-600 to-emerald-400" 
                      : playerPct > 25 
                      ? "from-yellow-600 to-orange-400" 
                      : "from-red-600 to-rose-500"
                  }`}
                  initial={{ width: `${playerPct}%` }}
                  animate={{ width: `${Math.max(0, playerPct)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {active.playerHp} / 100 HP
                </span>
              </div>
            </div>
          </div>

          {/* Duel Stage Visualization */}
          <div className="relative h-56 rounded-2xl border border-purple-500/20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-purple-950/40 shadow-inner">
            {/* Arena Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px]" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent" />
            
            {/* Attack Animation Beam */}
            {attackEffect && (
              <div 
                className={`absolute top-1/2 -translate-y-1/2 h-4 rounded-full z-30 ${
                  lastResult?.passed !== false 
                    ? "bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 shadow-[0_0_25px_rgba(6,182,212,0.8)]"
                    : "bg-gradient-to-l from-red-600 via-orange-500 to-purple-600 shadow-[0_0_25px_rgba(239,68,68,0.8)]"
                }`}
                style={{
                  animation: lastResult?.passed !== false 
                    ? "laserStrike 0.6s forwards ease-in-out"
                    : "shadowStrike 0.6s forwards ease-in-out"
                }}
              />
            )}

            {/* Left Player character block */}
            <motion.div
              className="absolute left-16 bottom-10 z-20 text-center"
              animate={playerHit ? { x: [0, -20, 20, -10, 10, 0] } : { y: [0, -5, 0] }}
              transition={playerHit ? { duration: 0.4 } : { duration: 2, repeat: Infinity }}
            >
              {playerHit && (
                <div className="absolute inset-0 bg-red-600/30 rounded-full blur-2xl -m-6 animate-ping" />
              )}
              <motion.div 
                className="text-7xl relative"
                animate={attackEffect && lastResult?.passed !== false ? { x: [0, 25, 0], scale: 1.1 } : {}}
                transition={{ duration: 0.3 }}
              >
                🧙‍♂️
                {/* Shield Effect if high combo */}
                {active.combo > 1 && (
                  <div className="absolute -inset-2 border-2 border-cyan-400/50 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                )}
              </motion.div>
              <div className="mt-2 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700 text-xs font-bold text-cyan-300">
                Кодчин
              </div>
            </motion.div>

            {/* Right Boss character block */}
            <motion.div
              className="absolute right-16 bottom-8 z-20 text-center"
              animate={bossHit ? { x: [0, 25, -25, 15, -15, 0], scale: [1, 0.95, 1] } : { y: [0, -8, 0] }}
              transition={bossHit ? { duration: 0.5 } : { duration: 2.5, repeat: Infinity }}
            >
              {bossHit && (
                <>
                  <div className="absolute inset-0 bg-purple-600/30 rounded-full blur-2xl -m-6 animate-ping" />
                  <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -60 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl font-black text-rose-500 drop-shadow-[0_2px_10px_rgba(244,63,94,0.5)] z-40"
                  >
                    -{lastResult?.damageDealt || 0}
                  </motion.div>
                </>
              )}
              <motion.div 
                className="boss-hover relative"
                animate={attackEffect && lastResult?.passed === false ? { x: [0, -25, 0], scale: 1.1 } : {}}
                transition={{ duration: 0.3 }}
              >
                <img 
                  src="/shadow_lord_boss.png" 
                  alt="Shadow Lord" 
                  className={`w-32 h-32 object-contain rounded-2xl border-2 transition-all ${
                    bossHit 
                      ? "border-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.7)] brightness-150" 
                      : "border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)]"
                  }`} 
                />
              </motion.div>
              <div className="mt-2 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700 text-xs font-bold text-red-400">
                Сүүдрийн Эзэн
              </div>
            </motion.div>

            {/* VS Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <span className="text-xs text-slate-500 tracking-widest font-black uppercase">Маргаан</span>
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 filter drop-shadow-[0_0_15px_rgba(255,100,0,0.6)]"
              >
                VS
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boss Skills Row */}
      <div className="space-y-2">
        <h3 className="text-white font-black tracking-wide text-sm uppercase flex items-center gap-1.5 px-1">
          <Flame className="w-4 h-4 text-red-400" /> Боссын идэвхжүүлэх чадварууд
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SHADOW_SKILLS.map((skill, idx) => {
            const isSelected = active.currentProblemIdx === idx;
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectSkill(idx)}
                disabled={loadingProblem}
                className={`relative p-4 rounded-xl text-left border transition-all overflow-hidden flex flex-col justify-between ${
                  isSelected 
                    ? `bg-gradient-to-br ${skill.color} ${skill.border} ${skill.glow} text-white`
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80 text-slate-300"
                }`}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-white/5 mix-blend-overlay animate-pulse pointer-events-none" />
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <Badge variant="outline" className={isSelected ? "border-white/40 text-white font-black" : "border-slate-800 text-slate-400 bg-slate-950/60"}>
                      {skill.difficulty}
                    </Badge>
                  </div>
                  <h4 className="font-extrabold text-base mb-1 tracking-wide">{skill.name}</h4>
                  <p className="text-xs opacity-75 leading-relaxed">{skill.description}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                  <span>Дайралт: +{skill.damage} HP</span>
                  <span className={isSelected ? "text-white" : "text-rose-400"}>Алдагдал: -{skill.penalty} HP</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Editor & Statement Workspace */}
      {problem ? (
        <div className="grid md:grid-cols-2 gap-4 relative">
          {loadingProblem && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-40 space-y-3">
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
              <p className="text-purple-300 font-bold text-sm tracking-wide">Сүүдрийн хүч цэнэглэгдэж байна...</p>
            </div>
          )}
          
          {/* Statement */}
          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-md shadow-lg flex flex-col rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <span className="font-black tracking-wide">{problem.title}</span>
                <Badge className="bg-purple-900/40 text-purple-300 border-purple-800/40 font-bold">
                  {problem.difficulty}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 max-h-[480px] overflow-y-auto space-y-4 py-4 scrollbar-none text-sm leading-relaxed">
              <div className="space-y-1">
                <h4 className="text-purple-400 font-bold tracking-wide text-xs uppercase">Бодлогын тайлбар</h4>
                <p className="text-slate-300 whitespace-pre-wrap">{problem.statement}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-purple-400 font-bold tracking-wide text-xs uppercase">Оролтын формат</h4>
                <p className="text-slate-300">{problem.inputDescription}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-purple-400 font-bold tracking-wide text-xs uppercase">Гаралтын формат</h4>
                <p className="text-slate-300">{problem.outputDescription}</p>
              </div>
              {(problem.examples ?? []).map((ex: any, i: number) => (
                <div key={i} className="border-t border-slate-800/80 pt-3 space-y-2">
                  <h4 className="text-cyan-400 text-xs font-bold tracking-wide uppercase">Жишээ дасгал {i + 1}</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">ОРОЛТ:</span>
                      <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-green-400 font-mono overflow-x-auto">{ex.input}</pre>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">ГАРАЛТ:</span>
                      <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-yellow-400 font-mono overflow-x-auto">{ex.output}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Code Editor */}
          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-md shadow-lg flex flex-col rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <span className="font-black tracking-wide">Кодын Талбар</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as BossAttackInputLanguage)}
                  className="bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <Suspense fallback={<div className="h-[360px] bg-[#0c0f16] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" /></div>}>
                  <Editor
                    height="360px"
                    language={language}
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    theme="vs-dark"
                    options={{ 
                      fontSize: 13, 
                      minimap: { enabled: false },
                      padding: { top: 10, bottom: 10 },
                      lineNumbersMinChars: 3,
                    }}
                    loading={<div className="h-[360px] bg-[#0c0f16] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" /></div>}
                  />
                </Suspense>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleAttack}
                  disabled={attackPending}
                  className="flex-1 bg-purple-650 hover:bg-purple-700 text-white font-bold py-5 rounded-xl border border-purple-500 shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 animate-pulse"
                >
                  <Swords className="w-5 h-5 text-white" /> Бодлогыг илгээх
                </Button>
                <Button
                  onClick={handleForfeit}
                  disabled={forfeitPending}
                  variant="outline"
                  className="border-slate-800 hover:bg-slate-900 text-slate-400 py-5 rounded-xl"
                >
                  <Flag className="w-4 h-4 mr-1.5" /> Бууж өгөх
                </Button>
              </div>
              {lastResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold border transition-all ${
                    lastResult.passed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                  }`}
                >
                  {lastResult.passed
                    ? `Дайралт амжилттай! Босст ${lastResult.damageDealt} хохирол учруулж, combo ${lastResult.fight?.combo || 1}x хүслээ!`
                    : `Тестүүд уналаа (${lastResult.passedCount}/${lastResult.totalCount}) • Сүүдрийн хүч танд ${lastResult.playerDamage} хохирол учрууллаа!`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : active.state !== "active" ? (
        <Card className={`${active.result === "victory" ? "border-emerald-500/40" : "border-rose-500/40"} bg-slate-950/70 backdrop-blur-md rounded-2xl`}>
          <CardContent className="py-16 text-center space-y-6">
            {active.result === "victory" ? (
              <>
                <Crown className="w-24 h-24 mx-auto text-yellow-400 animate-bounce filter drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                <h2 className="text-4xl font-extrabold text-white tracking-wide">ЯЛАЛТ байгууллаа!</h2>
                <p className="text-slate-300 text-lg">
                  +{active.rewardCoins} зоос, +{active.rewardXp} XP шагнал олголоо!
                  {active.rewardTitle && `, "${active.rewardTitle}" цол`}
                </p>
              </>
            ) : (
              <>
                <Skull className="w-24 h-24 mx-auto text-rose-500 animate-pulse" />
                <h2 className="text-4xl font-extrabold text-white tracking-wide">Тулаан дууслаа</h2>
                <p className="text-slate-400">Та бууж өгсөн эсвэл ялагдсан байна.</p>
              </>
            )}
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-5 rounded-xl">
              <Link href="/bosses">{t("common.back")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
