import { useParams, Link } from "wouter";
import {
  useGetHiringChallenge,
  useApplyToHiringChallenge,
  useGetHiringLeaderboard,
  getGetHiringChallengeQueryKey,
  getGetHiringLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Building2, Code2, Users, Trophy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HiringDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const cid = parseInt(id ?? "0", 10);
  const { data: c, isLoading } = useGetHiringChallenge(cid);
  const { data: board } = useGetHiringLeaderboard(cid);
  const apply = useApplyToHiringChallenge();

  const handleApply = () => {
    apply.mutate(
      { id: cid },
      {
        onSuccess: () => {
          toast({ title: "Өргөдөл гаргалаа" });
          qc.invalidateQueries({ queryKey: getGetHiringChallengeQueryKey(cid) });
          qc.invalidateQueries({ queryKey: getGetHiringLeaderboardQueryKey(cid) });
        },
        onError: () => toast({ title: "Өргөдөл гаргаж чадсангүй", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="container mx-auto p-8 text-gray-400">{t("common.loading")}</div>;
  if (!c) return <div className="container mx-auto p-8 text-gray-400">Олдсонгүй</div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-4xl">
      <Button asChild variant="ghost" size="sm">
        <Link href="/hiring">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Link>
      </Button>

      <Card className="border-white/10 bg-card/60">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">{c.title}</CardTitle>
              <p className="text-orange-300 mt-1 flex items-center gap-1">
                <Building2 className="w-4 h-4" /> {c.companyDisplayName}
              </p>
            </div>
            <Button
              onClick={handleApply}
              disabled={c.applied || apply.isPending}
              className="bg-orange-500/30 hover:bg-orange-500/40 border border-orange-500/50 text-orange-100"
              data-testid="button-apply"
            >
              {c.applied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> {t("hiring.applied")}
                </>
              ) : (
                t("hiring.apply")
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 whitespace-pre-wrap">{c.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <Badge variant="outline" className="border-orange-500/40 text-orange-200">
              <Users className="w-3 h-3 mr-1" /> {c.applicantCount} өргөдөл
            </Badge>
            <Badge variant="outline">{c.positions} орон тоо</Badge>
            <Badge variant="outline">{(c.problems ?? []).length} бодлого</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-orange-300" /> Бодлогууд
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(c.problems ?? []).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded border border-white/10 hover:bg-white/5"
              >
                <div>
                  <span className="text-white font-medium">{p.title}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {p.difficulty}
                  </Badge>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/problems/${p.slug}`}>Бодох</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-300" /> {t("hiring.leaderboard")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(board ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm">Хараахан өргөдөл алга</p>
          ) : (
            <div className="space-y-2">
              {(board ?? []).map((b: any, i: number) => (
                <div
                  key={b.userId}
                  className="flex items-center gap-3 p-2 rounded border border-white/10"
                >
                  <span className={`text-lg font-bold w-8 text-center ${i === 0 ? "text-yellow-300" : "text-gray-400"}`}>
                    #{i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={b.avatarUrl || ""} />
                    <AvatarFallback>{b.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Link href={`/profile/${b.username}`} className="flex-1 text-white hover:text-purple-300">
                    {b.displayName ?? b.username}
                  </Link>
                  <span className="text-sm text-gray-400">
                    {b.solvedCount} бодлого • {b.score} оноо
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
