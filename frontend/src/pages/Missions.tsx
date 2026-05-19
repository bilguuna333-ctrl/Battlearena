import { useGetMyMissions, useClaimMission, getGetMyMissionsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Coins, Star, Award, Swords, Code2, Trophy, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ICONS: Record<string, any> = {
  target: Target,
  swords: Swords,
  code: Code2,
  trophy: Trophy,
  flame: Flame,
  award: Award,
};

export default function Missions() {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: missions, isLoading } = useGetMyMissions();
  const claim = useClaimMission();

  const daily = (missions ?? []).filter((m: any) => m.period === "daily");
  const weekly = (missions ?? []).filter((m: any) => m.period === "weekly");

  const handleClaim = (id: number) => {
    claim.mutate(
      { id },
      {
        onSuccess: (res: any) => {
          toast({
            title: "Шагнал авлаа!",
            description: `+${res?.rewardXp ?? 0} XP, +${res?.rewardCoins ?? 0} зоос`,
          });
          qc.invalidateQueries({ queryKey: getGetMyMissionsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          toast({ title: "Шагнал авч чадсангүй", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
          <Target className="w-6 h-6 text-yellow-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("mission.title")}</h1>
          <p className="text-gray-400 text-sm">{t("mission.subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="bg-card/60 border border-white/10">
          <TabsTrigger value="daily">{t("mission.daily")}</TabsTrigger>
          <TabsTrigger value="weekly">{t("mission.weekly")}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
          {isLoading ? (
            <p className="text-gray-400">{t("common.loading")}</p>
          ) : daily.length === 0 ? (
            <p className="text-gray-400">Алга байна</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {daily.map((m: any) => (
                <MissionCard key={m.id} m={m} onClaim={() => handleClaim(m.id)} t={t} loading={claim.isPending} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          {weekly.length === 0 ? (
            <p className="text-gray-400">Долоо хоног тутмын даалгавар алга</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {weekly.map((m: any) => (
                <MissionCard key={m.id} m={m} onClaim={() => handleClaim(m.id)} t={t} loading={claim.isPending} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MissionCard({ m, onClaim, t, loading }: any) {
  const Icon = ICONS[m.icon] ?? Target;
  const done = m.progress >= m.goalCount;
  const claimed = !!m.claimed;
  return (
    <Card
      className={`border-white/10 bg-card/60 transition-all ${
        claimed ? "opacity-60" : done ? "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]" : ""
      }`}
      data-testid={`card-mission-${m.id}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${done ? "text-yellow-300" : "text-purple-300"}`} />
          <span className="flex-1">{m.title}</span>
          {claimed && <Badge variant="outline" className="text-xs">{t("mission.claimed")}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-400">{m.description}</p>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t("mission.progress")}</span>
            <span>
              {Math.min(m.progress, m.goalCount)} / {m.goalCount}
            </span>
          </div>
          <Progress value={(m.percent ?? 0) * 100} className="h-2" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-yellow-300">
              <Coins className="w-3 h-3" /> {m.rewardCoins}
            </span>
            <span className="flex items-center gap-1 text-purple-300">
              <Star className="w-3 h-3" /> {m.rewardXp} XP
            </span>
            {m.rewardBadge && (
              <span className="flex items-center gap-1 text-pink-300">
                <Award className="w-3 h-3" /> {m.rewardBadge}
              </span>
            )}
          </div>
          <Button
            size="sm"
            disabled={!done || claimed || loading}
            onClick={onClaim}
            data-testid={`button-claim-${m.id}`}
            className={done && !claimed ? "bg-yellow-500/30 hover:bg-yellow-500/40 border border-yellow-500/50 text-yellow-100" : ""}
          >
            {claimed ? t("mission.claimed") : t("mission.claim")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
