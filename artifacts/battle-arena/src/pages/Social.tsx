import { useState } from "react";
import { Link } from "wouter";
import {
  useGetActivityFeed,
  useGetFriends,
  useAcceptFriendRequest,
  useSendFriendRequest,
  getGetFriendsQueryKey,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Activity, UserPlus, MessageCircle, Trophy, Swords, Skull, Target, Flame, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FEED_ICONS: Record<string, any> = {
  battle_win: Trophy,
  battle_loss: Skull,
  problem_solved: CheckCircle2,
  mission_completed: Target,
  boss_defeated: Flame,
  follow: UserPlus,
  level_up: Trophy,
};

export default function Social() {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const { data: feed } = useGetActivityFeed();
  const { data: friends } = useGetFriends();
  const sendReq = useSendFriendRequest();
  const acceptReq = useAcceptFriendRequest();
  const [target, setTarget] = useState("");

  const accepted = (friends?.friends ?? []) as any[];
  const pending = (friends?.incoming ?? []) as any[];
  const outgoing = (friends?.outgoing ?? []) as any[];

  const handleSend = () => {
    if (!target.trim()) return;
    sendReq.mutate(
      { data: { username: target.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Найзын хүсэлт илгээлээ" });
          setTarget("");
          qc.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        },
        onError: () => toast({ title: "Илгээх боломжгүй", variant: "destructive" }),
      },
    );
  };

  const handleAccept = (username: string) => {
    acceptReq.mutate(
      { data: { username } },
      {
        onSuccess: () => {
          toast({ title: "Найз болсон!" });
          qc.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-pink-500/20 border border-pink-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          <Users className="w-6 h-6 text-pink-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("nav.social")}</h1>
          <p className="text-gray-400 text-sm">Найзууд, мэссеж, идэвх</p>
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList className="bg-card/60 border border-white/10">
          <TabsTrigger value="feed">
            <Activity className="w-4 h-4 mr-1" /> {t("social.feed")}
          </TabsTrigger>
          <TabsTrigger value="friends">
            <Users className="w-4 h-4 mr-1" /> {t("social.friends")}
            {accepted.length > 0 && <Badge className="ml-2 h-5">{accepted.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requests">
            <UserPlus className="w-4 h-4 mr-1" /> {t("social.requests")}
            {pending.length > 0 && <Badge className="ml-2 h-5 bg-yellow-500/30 text-yellow-200 border-yellow-500/40">{pending.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4 space-y-3">
          {(feed ?? []).length === 0 ? (
            <Card className="border-white/10 bg-card/50">
              <CardContent className="py-12 text-center text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                {t("social.empty_feed")}
              </CardContent>
            </Card>
          ) : (
            (feed ?? []).map((item: any) => {
              const Icon = FEED_ICONS[item.type] ?? Activity;
              return (
                <Card key={item.id} className="border-white/10 bg-card/60 hover:bg-card/80 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.avatarSeed || item.username}`} />
                      <AvatarFallback>{item.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/profile/${item.username}`} className="font-semibold text-white hover:text-purple-300">
                        {item.displayName ?? item.username}
                      </Link>
                      <p className="text-sm text-gray-300">{item.message ?? item.type}</p>
                      <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <Icon className="w-5 h-5 text-purple-300" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {accepted.length === 0 && (
              <p className="text-gray-400 col-span-2">{t("social.no_friends")}</p>
            )}
            {accepted.map((f: any) => (
              <Card key={f.username} className="border-white/10 bg-card/60">
                <CardContent className="py-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatarSeed || f.username}`} />
                    <AvatarFallback>{f.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Link href={`/profile/${f.username}`} className="font-semibold text-white hover:text-purple-300">
                      {f.displayName ?? f.username}
                    </Link>
                    <p className="text-xs text-gray-400">{f.eloRating} ELO</p>
                  </div>
                  <Button asChild size="sm" variant="outline" data-testid={`button-message-${f.username}`}>
                    <Link href={`/messages/${f.username}`}>
                      <MessageCircle className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card className="border-white/10 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base text-white">Шинэ найз нэмэх</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Хэрэглэгчийн нэр"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                data-testid="input-friend-username"
              />
              <Button onClick={handleSend} disabled={sendReq.isPending} data-testid="button-send-friend">
                <UserPlus className="w-4 h-4 mr-1" /> Илгээх
              </Button>
            </CardContent>
          </Card>

          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Ирсэн хүсэлт</h3>
              <div className="grid gap-2">
                {pending.map((f: any) => (
                  <Card key={f.username} className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="py-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatarSeed || f.username}`} />
                        <AvatarFallback>{f.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-semibold text-white">{f.displayName ?? f.username}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(f.username)}
                        data-testid={`button-accept-${f.username}`}
                        className="bg-green-500/30 hover:bg-green-500/40 border border-green-500/40 text-green-200"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {outgoing.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Илгээсэн</h3>
              <div className="grid gap-2">
                {outgoing.map((f: any) => (
                  <Card key={f.username} className="border-white/10 bg-card/40">
                    <CardContent className="py-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatarSeed || f.username}`} />
                        <AvatarFallback>{f.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="text-gray-300">{f.displayName ?? f.username}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Хүлээгдэж буй
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
