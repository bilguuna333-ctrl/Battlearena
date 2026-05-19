import { Link } from "wouter";
import { useGetUserBattleHistory, useGetMe, getGetMeQueryKey, getGetUserBattleHistoryQueryKey } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Clock, Trophy, Skull, Minus } from "lucide-react";

export default function Replays() {
  const t = useT();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({
    query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() },
  });
  const { data: history, isLoading } = useGetUserBattleHistory(me?.username ?? "", {
    query: {
      enabled: !!me?.username,
      queryKey: getGetUserBattleHistoryQueryKey(me?.username ?? ""),
    },
  });

  const finished = (history ?? []).filter((b: any) => b.state === "finished" || b.finishedAt);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-purple-500/20 border border-purple-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <Film className="w-6 h-6 text-purple-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("replay.title")}</h1>
          <p className="text-gray-400 text-sm">{t("replay.subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400">{t("common.loading")}</div>
      ) : finished.length === 0 ? (
        <Card className="border-white/10 bg-card/50">
          <CardContent className="py-16 text-center">
            <Film className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">{t("replay.empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/battle">{t("nav.battle")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {finished.map((b: any) => {
            const isWin = b.result === "win" || b.winnerId === me?.id;
            const isDraw = b.result === "draw";
            return (
              <Card
                key={b.id}
                className="border-white/10 bg-card/60 hover:bg-card/80 hover:border-purple-500/50 transition-all"
                data-testid={`card-replay-${b.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white truncate">
                      {b.problemTitle ?? `Battle #${b.id.slice(0, 6)}`}
                    </CardTitle>
                    {isDraw ? (
                      <Badge variant="outline" className="border-gray-500 text-gray-300">
                        <Minus className="w-3 h-3 mr-1" /> Тэнцсэн
                      </Badge>
                    ) : isWin ? (
                      <Badge className="bg-green-500/20 text-green-300 border border-green-500/50">
                        <Trophy className="w-3 h-3 mr-1" /> Ялсан
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-300 border border-red-500/50">
                        <Skull className="w-3 h-3 mr-1" /> Хожигдсон
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.startedAt).toLocaleString()}
                    </div>
                    <span className="text-purple-300 uppercase">{b.mode || "ranked"}</span>
                  </div>
                  <Button asChild size="sm" className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40">
                    <Link href={`/replay/${b.id}`}>
                      <Film className="w-4 h-4 mr-2" /> {t("replay.play")}
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
