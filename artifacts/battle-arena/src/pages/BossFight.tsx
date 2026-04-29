import { useEffect, useMemo, useState } from "react";
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
import Editor from "@monaco-editor/react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Heart, Zap, Crown, Coins, Star, Skull, ArrowLeft, Play, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    query: { queryKey: getGetBossQueryKey(slug!) },
  });
  const { data: active, isLoading: activeLoading } = useGetActiveBossFight({
    query: { refetchInterval: 5000, queryKey: getGetActiveBossFightQueryKey() },
  });
  const start = useStartBossFight();
  const attack = useBossAttack();
  const forfeit = useForfeitBossFight();

  const [language, setLanguage] = useState<BossAttackInputLanguage>(BossAttackInputLanguage.javascript);
  const [code, setCode] = useState(STARTERS.javascript);
  const [lastResult, setLastResult] = useState<any>(null);

  const isActive = active && active.bossSlug === slug && active.state === "active";

  useEffect(() => {
    if (isActive && active?.currentProblem) {
      setCode((c) => (c === STARTERS[language] ? STARTERS[language] : c));
    }
  }, [isActive, active?.currentProblemIdx]);

  useEffect(() => {
    setCode(STARTERS[language]);
  }, [language]);

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
          if (res.passed) {
            toast({
              title: `Дайралт амжилттай! -${res.bossDamage} HP`,
              description: `Цуврал: ${res.combo}x`,
            });
          } else {
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

  if (bossLoading || activeLoading)
    return <div className="container mx-auto p-8 text-gray-400">{t("common.loading")}</div>;
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
                Та өөр бөсстэй тулалдаж байна.{" "}
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
      <Card className="border-red-500/40 bg-card/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
        <CardContent className="py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-red-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 animate-pulse" /> {active.bossName}
                </span>
                <span className="text-xs text-gray-400">
                  Шат {active.currentProblemIdx + 1}/{active.totalProblems}
                </span>
              </div>
              <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-red-500/30">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                  style={{ width: `${bossPct}%` }}
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
              <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    playerPct > 50 ? "bg-gradient-to-r from-green-600 to-green-400" : playerPct > 25 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" : "bg-gradient-to-r from-red-600 to-red-400"
                  }`}
                  style={{ width: `${Math.max(0, playerPct)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                  {active.playerHp} / 100
                </span>
              </div>
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
                <Editor
                  height="400px"
                  language={language}
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  theme="vs-dark"
                  options={{ fontSize: 13, minimap: { enabled: false } }}
                />
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
                    ? `Амжилттай! Бөос -${lastResult.bossDamage} HP, цуврал ${lastResult.combo}x`
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
