import { useState } from "react";
import { Link } from "wouter";
import {
  useListMyMentorGroups,
  useCreateMentorGroup,
  useJoinMentorGroup,
  getListMyMentorGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { GraduationCap, Plus, Users, KeyRound, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Mentor() {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: groups, isLoading } = useListMyMentorGroups();
  const createGroup = useCreateMentorGroup();
  const joinGroup = useJoinMentorGroup();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { data: { name: name.trim(), description: desc.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Бүлэг үүслээ" });
          setCreateOpen(false);
          setName("");
          setDesc("");
          qc.invalidateQueries({ queryKey: getListMyMentorGroupsQueryKey() });
        },
      },
    );
  };

  const handleJoin = () => {
    if (!code.trim()) return;
    joinGroup.mutate(
      { data: { joinCode: code.trim().toUpperCase() } },
      {
        onSuccess: () => {
          toast({ title: "Бүлэгт нэгдлээ" });
          setJoinOpen(false);
          setCode("");
          qc.invalidateQueries({ queryKey: getListMyMentorGroupsQueryKey() });
        },
        onError: () => toast({ title: "Код буруу байна", variant: "destructive" }),
      },
    );
  };

  const ledGroups = (groups ?? []).filter((g: any) => g.role === "mentor");
  const memberGroups = (groups ?? []).filter((g: any) => g.role === "member");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <GraduationCap className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">{t("mentor.groups")}</h1>
            <p className="text-gray-400 text-sm">Багш-сурагчийн систем</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-join-group">
                <KeyRound className="w-4 h-4 mr-1" /> {t("mentor.join")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("mentor.join")}</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Жнь: MENTOR1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="input-join-code"
              />
              <DialogFooter>
                <Button onClick={handleJoin} disabled={joinGroup.isPending}>
                  Нэгдэх
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-group" className="bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-500/50">
                <Plus className="w-4 h-4 mr-1" /> {t("mentor.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("mentor.create")}</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Бүлгийн нэр"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-group-name"
              />
              <Textarea
                placeholder="Тайлбар"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                data-testid="input-group-desc"
              />
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createGroup.isPending}>
                  {t("common.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : (
        <>
          {ledGroups.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-cyan-300 mb-3">Миний удирддаг</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {ledGroups.map((g: any) => (
                  <GroupCard key={g.id} g={g} mentor />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-lg font-semibold text-purple-300 mb-3">Миний нэгдсэн</h2>
            {memberGroups.length === 0 ? (
              <p className="text-gray-400">Бүлэг алга. Бүлэгт нэгдэх кодоо ашиглаарай.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {memberGroups.map((g: any) => (
                  <GroupCard key={g.id} g={g} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GroupCard({ g, mentor }: { g: any; mentor?: boolean }) {
  return (
    <Card className="border-white/10 bg-card/60 hover:border-cyan-500/40 transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-300" />
          {g.name}
          {mentor && <Badge className="bg-cyan-500/30 border-cyan-500/50 text-cyan-200">Багш</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {g.description && <p className="text-sm text-gray-400">{g.description}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {g.memberCount ?? 0}
            </span>
            <span className="font-mono text-cyan-300">{g.joinCode}</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/mentor/${g.id}`}>Үзэх</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
