import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetMentorGroup,
  useCreateAssignment,
  getGetMentorGroupQueryKey,
  useListProblems,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Users, ClipboardList, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MentorGroup() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const groupId = parseInt(id ?? "0", 10);
  const { data: group, isLoading } = useGetMentorGroup(groupId);
  const { data: problems } = useListProblems();
  const createAssignment = useCreateAssignment();

  const [aOpen, setAOpen] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aProblem, setAProblem] = useState<string>("");
  const [aNotes, setANotes] = useState("");

  const handleCreateAssignment = () => {
    if (!aTitle.trim() || !aProblem) return;
    createAssignment.mutate(
      {
        id: groupId,
        data: { title: aTitle.trim(), problemSlug: aProblem, notes: aNotes.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast({ title: "Даалгавар нэмлээ" });
          setAOpen(false);
          setATitle("");
          setAProblem("");
          setANotes("");
          qc.invalidateQueries({ queryKey: getGetMentorGroupQueryKey(groupId) });
        },
      },
    );
  };

  if (isLoading) return <div className="container mx-auto p-8 text-gray-400">{t("common.loading")}</div>;
  if (!group) return <div className="container mx-auto p-8 text-gray-400">Бүлэг олдсонгүй</div>;

  const isMentor = !!group.isMentor;

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/mentor">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Link>
      </Button>

      <Card className="border-white/10 bg-card/60">
        <CardContent className="py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>
              {group.description && <p className="text-gray-400 mt-1">{group.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-sm text-gray-400">
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">
                  <KeyRound className="w-3 h-3 mr-1" /> {group.joinCode}
                </Badge>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {(group.members ?? []).length} гишүүн
                </span>
              </div>
            </div>
            {isMentor && (
              <Dialog open={aOpen} onOpenChange={setAOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-500/50" data-testid="button-add-assignment">
                    <Plus className="w-4 h-4 mr-1" /> Даалгавар нэмэх
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Шинэ даалгавар</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Даалгаврын нэр"
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    data-testid="input-assignment-title"
                  />
                  <select
                    className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm"
                    value={aProblem}
                    onChange={(e) => setAProblem(e.target.value)}
                    data-testid="select-assignment-problem"
                  >
                    <option value="">-- Бодлого сонго --</option>
                    {(problems ?? []).map((p: any) => (
                      <option key={p.id} value={p.slug}>
                        {p.title} ({p.difficulty})
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Тэмдэглэл"
                    value={aNotes}
                    onChange={(e) => setANotes(e.target.value)}
                    data-testid="input-assignment-notes"
                  />
                  <DialogFooter>
                    <Button onClick={handleCreateAssignment} disabled={createAssignment.isPending}>
                      Үүсгэх
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assignments">
        <TabsList className="bg-card/60 border border-white/10">
          <TabsTrigger value="assignments">
            <ClipboardList className="w-4 h-4 mr-1" /> {t("mentor.assignments")}
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1" /> {t("mentor.members")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4 space-y-3">
          {(group.assignments ?? []).length === 0 ? (
            <p className="text-gray-400">Даалгавар алга</p>
          ) : (
            (group.assignments ?? []).map((a: any) => (
              <Card key={a.id} className="border-white/10 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base text-white">{a.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {a.notes && <p className="text-sm text-gray-400 mb-2">{a.notes}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{a.submissionCount ?? 0} илгээсэн</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/problems/${a.problemSlug}`}>Бодох</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="grid gap-2 md:grid-cols-2">
            {(group.members ?? []).map((m: any) => (
              <Card key={m.userId} className="border-white/10 bg-card/60">
                <CardContent className="py-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.avatarUrl || ""} />
                    <AvatarFallback>{m.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Link href={`/profile/${m.username}`} className="font-semibold text-white hover:text-purple-300">
                      {m.displayName ?? m.username}
                    </Link>
                    <p className="text-xs text-gray-400">{m.eloRating} ELO</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
