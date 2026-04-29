import { Link } from "wouter";
import { useListHiringChallenges } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, Users, Code2 } from "lucide-react";

export default function Hiring() {
  const t = useT();
  const { data: challenges, isLoading } = useListHiringChallenges();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-orange-500/20 border border-orange-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          <Briefcase className="w-6 h-6 text-orange-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("hiring.title")}</h1>
          <p className="text-gray-400 text-sm">{t("hiring.subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : (challenges ?? []).length === 0 ? (
        <Card className="border-white/10 bg-card/50">
          <CardContent className="py-12 text-center text-gray-400">Идэвхтэй ажил байхгүй</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(challenges ?? []).map((c: any) => (
            <Card
              key={c.id}
              className="border-white/10 bg-card/60 hover:border-orange-500/40 transition-all"
              data-testid={`card-hiring-${c.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{c.title}</CardTitle>
                    <p className="text-sm text-orange-300 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {c.companyDisplayName}
                    </p>
                  </div>
                  {c.applied && (
                    <Badge className="bg-green-500/30 border-green-500/50 text-green-200">
                      {t("hiring.applied")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400 line-clamp-3">{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> {c.problemCount} бодлого
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {c.applicantCount} өргөдөл
                  </span>
                  <span>•</span>
                  <span>
                    {c.positions} {t("hiring.positions").toLowerCase()}
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40"
                >
                  <Link href={`/hiring/${c.id}`}>Дэлгэрэнгүй</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
