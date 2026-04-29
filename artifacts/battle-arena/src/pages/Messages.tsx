import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetConversation, useSendMessage, getGetConversationQueryKey, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";

export default function Messages() {
  const { username } = useParams<{ username: string }>();
  const t = useT();
  const qc = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const { data: convo } = useGetConversation(username!, {
    query: {
      refetchInterval: 4000,
      queryKey: getGetConversationQueryKey(username!),
    },
  });
  const sendMsg = useSendMessage();
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [convo?.length]);

  const handleSend = () => {
    if (!text.trim() || !username) return;
    const body = text.trim();
    setText("");
    sendMsg.mutate(
      { data: { toUsername: username, body } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetConversationQueryKey(username) });
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/social">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-white">@{username}</h1>
      </div>

      <Card className="border-white/10 bg-card/60">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-base text-white">Хувийн зурвас</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={scrollerRef} className="h-[450px] overflow-y-auto p-4 space-y-2">
            {(convo ?? []).length === 0 && (
              <p className="text-center text-gray-500 py-12">Зурвас байхгүй. Эхэлж бичээрэй!</p>
            )}
            {(convo ?? []).map((m: any) => {
              const mine = m.fromUserId === me?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      mine
                        ? "bg-purple-500/30 border border-purple-500/40 text-purple-100"
                        : "bg-white/5 border border-white/10 text-gray-200"
                    }`}
                  >
                    <p className="text-sm">{m.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/10 p-3 flex gap-2">
            <Input
              placeholder={t("social.message_placeholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              data-testid="input-message"
            />
            <Button onClick={handleSend} disabled={!text.trim() || sendMsg.isPending} data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
