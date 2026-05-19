import { Link } from "wouter";
import { useListBosses } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Shield, Crown, Coins, Star, Skull, Swords, Heart } from "lucide-react";

const ICONS: Record<string, any> = {
  shield: Shield,
  flame: Flame,
  crown: Crown,
  skull: Skull,
};

const THEMES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-400", text: "text-purple-300" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400", text: "text-red-300" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "text-orange-400", text: "text-orange-300" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: "text-cyan-400", text: "text-cyan-300" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: "text-yellow-400", text: "text-yellow-300" },
};

export default function Bosses() {
  const t = useT();
  const { data: bosses, isLoading } = useListBosses();

  return (
    <div className="min-h-screen bg-[#111] flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <Skull className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t("boss.title")}
          </h1>
          <p className="text-gray-400 text-sm">
            {t("boss.subtitle")}
          </p>
        </div>

        {/* Boss Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {(bosses ?? []).map((b: any) => {
              const Icon = ICONS[b.icon] ?? Flame;
              const theme = THEMES[b.artColor] ?? THEMES.red;
              
              return (
                <Card
                  key={b.id}
                  className="h-full flex flex-col bg-[#1a1a1a] border border-white/5 hover:border-white/10 transition-colors"
                >
                    
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-lg ${theme.bg} ${theme.border} border flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${theme.icon}`} />
                        </div>
                        {b.defeated && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">
                            <Crown className="w-3 h-3 mr-1" /> {t("boss.defeated")}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-[10px] uppercase tracking-wider font-medium ${theme.text} mb-1`}>
                        {b.title}
                      </p>
                      <CardTitle className="text-lg font-semibold text-white">
                        {b.name}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col pt-0">
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                        {b.description}
                      </p>
                      
                      <div className="space-y-2 mb-4 p-3 rounded-lg bg-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> HP</span>
                          <span className="text-red-400 font-medium">{b.maxHp}</span>
                        </div>
                        <div className="h-1 w-full bg-red-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 w-full" />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Swords className="w-3 h-3" /> {b.problemCount} {t("boss.stages")}
                          </span>
                          <span>{b.difficulty}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-0.5">
                          <Coins className="w-2.5 h-2.5 mr-1" /> {b.rewardCoins}
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5">
                          <Star className="w-2.5 h-2.5 mr-1" /> {b.rewardXp} XP
                        </Badge>
                        {b.rewardTitle && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-300 text-xs px-2 py-0.5">
                            "{b.rewardTitle}"
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        asChild
                        size="sm"
                        className={`w-full ${
                          b.defeated 
                            ? "bg-white/5 hover:bg-white/10 text-gray-400" 
                            : "bg-red-600 hover:bg-red-500 text-white"
                        }`}
                      >
                        <Link href={`/bosses/${b.slug}`}>
                          {b.defeated ? t("boss.continue") : (
                            <>
                              <Flame className="w-4 h-4 mr-1.5" /> {t("boss.start")}
                            </>
                          )}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
