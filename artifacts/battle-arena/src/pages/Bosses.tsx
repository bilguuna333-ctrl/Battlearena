import { Link } from "wouter";
import { useListBosses } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Shield, Crown, Coins, Star, Skull } from "lucide-react";

const ICONS: Record<string, any> = {
  shield: Shield,
  flame: Flame,
  crown: Crown,
  skull: Skull,
};

const COLORS: Record<string, string> = {
  purple: "border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.3)]",
  red: "border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.3)]",
  orange: "border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.3)]",
  cyan: "border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)]",
  yellow: "border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.3)]",
};

export default function Bosses() {
  const t = useT();
  const { data: bosses, isLoading } = useListBosses();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
          <Flame className="w-6 h-6 text-red-300 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("boss.title")}</h1>
          <p className="text-gray-400 text-sm">{t("boss.subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {(bosses ?? []).map((b: any) => {
            const Icon = ICONS[b.icon] ?? Flame;
            const color = COLORS[b.artColor] ?? COLORS.purple;
            return (
              <Card
                key={b.id}
                className={`border bg-card/60 transition-all hover:scale-[1.02] ${color}`}
                data-testid={`card-boss-${b.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-16 h-16 rounded-lg bg-${b.artColor}-500/20 border-2 border-${b.artColor}-500/40 flex items-center justify-center`}
                    >
                      <Icon className={`w-8 h-8 text-${b.artColor}-300`} />
                    </div>
                    {b.defeated && (
                      <Badge className="bg-green-500/30 border border-green-500/50 text-green-200">
                        <Crown className="w-3 h-3 mr-1" /> {t("boss.defeated")}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl text-white mt-3">{b.name}</CardTitle>
                  <p className="text-xs uppercase tracking-wider text-gray-400">{b.title}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-300 line-clamp-2">{b.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline" className="border-red-500/30 text-red-300">
                      HP {b.maxHp}
                    </Badge>
                    <Badge variant="outline">{b.problemCount} шат</Badge>
                    <Badge variant="outline">{b.difficulty}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1 text-yellow-300">
                      <Coins className="w-3 h-3" /> {b.rewardCoins}
                    </span>
                    <span className="flex items-center gap-1 text-purple-300">
                      <Star className="w-3 h-3" /> {b.rewardXp} XP
                    </span>
                    {b.rewardTitle && (
                      <span className="text-pink-300 italic">"{b.rewardTitle}"</span>
                    )}
                  </div>
                  <Button
                    asChild
                    className="w-full bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-100"
                  >
                    <Link href={`/bosses/${b.slug}`}>
                      <Flame className="w-4 h-4 mr-1" /> {t("boss.start")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
