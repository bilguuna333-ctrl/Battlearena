import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { invitationsApi, type Invitation, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const SOCKET_URL = API_BASE_URL;

export function BattleInviteNotification() {
  const t = useT();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user } = useGetMe({ query: { enabled: !!token, queryKey: getGetMeQueryKey() } });
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [countdown, setCountdown] = useState(30);
  const socketRef = useRef<Socket | null>(null);

  const acceptMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.accept(id),
    onSuccess: (data) => {
      setInvitation(null);
      toast.success(t("battle.invite_accepted"));
      if (data.battleId) setLocation(`/battle/${data.battleId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.decline(id),
    onSuccess: () => {
      setInvitation(null);
      toast.message(t("battle.invite_declined"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!user?.username) return;
    
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", `user:${user.username}`);
    });

    socket.on("battle:invitation", (inv: Invitation) => {
      setInvitation(inv);
      setCountdown(30);
    });

    socket.on("battle:invitation:cancelled", () => {
      setInvitation(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.username]);

  useEffect(() => {
    if (!invitation) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setInvitation(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invitation]);

  if (!invitation) return null;

  const fromUser = invitation.from;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Swords className="w-8 h-8 text-orange-500" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Battle урилга!</h2>
          
          <div className="flex items-center justify-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
            <Avatar className="w-12 h-12 border border-white/10">
              <AvatarImage src={fromUser?.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${fromUser.avatarSeed}` : undefined} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 font-bold">
                {fromUser?.displayName?.[0] || fromUser?.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold text-white">{fromUser?.displayName || fromUser?.username}</p>
              <p className="text-sm text-gray-400">ELO: {fromUser?.eloRating || 1000}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-orange-400">{countdown}s</div>
            <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-1000"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => declineMutation.mutate(invitation.id)}
              disabled={declineMutation.isPending}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-1" /> Татгалзах
            </Button>
            <Button
              onClick={() => acceptMutation.mutate(invitation.id)}
              disabled={acceptMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              <Check className="w-4 h-4 mr-1" /> Зөвшөөрөх
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
