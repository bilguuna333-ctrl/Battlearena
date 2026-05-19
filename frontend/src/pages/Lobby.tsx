import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Copy,
  LogOut,
  Play,
  Users,
  Zap,
  Hourglass,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { lobbyApi, type Lobby as LobbyType, API_BASE_URL } from "@/lib/api";
import { useT } from "@/lib/i18n";

const SOCKET_URL = API_BASE_URL;

export default function Lobby() {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("codesteppe_token")
      : null;
  const { data: me } = useGetMe({
    query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() },
  });

  useEffect(() => {
    if (!token && !me) setLocation("/login");
  }, [token, me, setLocation]);

  const lobbyKey = ["lobby", code] as const;
  const { data: lobby, isLoading, error } = useQuery<LobbyType>({
    queryKey: lobbyKey,
    queryFn: () =>
      code ? lobbyApi.byCode(code) : Promise.reject(new Error("no code")),
    enabled: !!code && !!token,
    refetchInterval: 4000,
  });

  const setLobbyData = (next: LobbyType | null) => {
    if (next) qc.setQueryData(lobbyKey, next);
    else qc.invalidateQueries({ queryKey: lobbyKey });
  };

  const setReadyMutation = useMutation({
    mutationFn: (ready: boolean) =>
      lobbyApi.setReady(lobby!.id, ready),
    onSuccess: (data) => setLobbyData(data),
    onError: (err: Error) => toast.error(err.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => lobbyApi.leave(lobby!.id),
    onSuccess: () => {
      toast.message(t("lobby.left"));
      setLocation("/battle");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startMutation = useMutation({
    mutationFn: () => lobbyApi.start(lobby!.id),
    onSuccess: (data) => {
      if (data.battleId) setLocation(`/battle/${data.battleId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Socket subscription
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!me?.username || !lobby?.id) return;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join-room", `user:${me.username}`);
    });

    const onUpdated = (next: LobbyType) => {
      if (next.id === lobby.id) qc.setQueryData(lobbyKey, next);
    };
    const onStarted = (data: { id: string; battleId: string }) => {
      if (data.id === lobby.id && data.battleId) {
        setLocation(`/battle/${data.battleId}`);
      }
    };
    const onClosed = (data: { id: string }) => {
      if (data.id === lobby.id) {
        toast.message(t("lobby.closed"));
        setLocation("/battle");
      }
    };
    socket.on("lobby:updated", onUpdated);
    socket.on("lobby:started", onStarted);
    socket.on("lobby:closed", onClosed);
    return () => {
      socket.off("lobby:updated", onUpdated);
      socket.off("lobby:started", onStarted);
      socket.off("lobby:closed", onClosed);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [me?.username, lobby?.id, qc, setLocation, t]);

  // Auto-redirect when lobby state goes to 'started'
  useEffect(() => {
    if (lobby?.state === "started" && lobby.battleId) {
      setLocation(`/battle/${lobby.battleId}`);
    }
  }, [lobby?.state, lobby?.battleId, setLocation]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !lobby) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card border border-red-500/30 rounded-xl p-6 max-w-sm text-center">
          <h2 className="text-lg font-semibold mb-2">{t("lobby.not_found")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {(error as Error)?.message || ""}
          </p>
          <Button onClick={() => setLocation("/battle")}>
            {t("common.back")}
          </Button>
        </div>
      </div>
    );
  }

  const myMember = lobby.members.find((m) => m.userId === me?.id);
  const isHost = myMember?.isHost === true;
  const allReady = lobby.members.every((m) => m.ready);
  const enoughPlayers = lobby.members.length >= 2;
  const canStart = isHost && allReady && enoughPlayers && lobby.state === "open";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      toast.success(t("lobby.code_copied"));
    } catch {
      toast.error(t("error.title"));
    }
  };

  const modeLabel =
    lobby.mode === "ranked"
      ? t("battle.mode_ranked")
      : lobby.mode === "practice"
        ? t("battle.mode_practice")
        : t("battle.mode_normal");

  return (
    <div className="flex-1 flex flex-col items-center relative p-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full relative z-10"
      >
        {/* Header */}
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4 shadow-2xl">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t("lobby.code")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {lobby.code}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCode}
                  className="h-8 border-white/10"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {t("lobby.copy_code")}
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant="outline"
                className="border-primary/40 text-primary bg-primary/10"
              >
                {modeLabel}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {lobby.members.length} / {lobby.maxPlayers}
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2 mb-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {t("lobby.members")}
            </div>
            {lobby.members.map((m) => (
              <div
                key={m.userId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  m.ready
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/10 bg-background/30"
                }`}
              >
                <img
                  src={m.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.avatarSeed}` : ""}
                  alt={m.username}
                  className="w-10 h-10 rounded bg-white/5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{m.displayName}</span>
                    {m.isHost && (
                      <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                        <Crown className="w-3 h-3" />
                        {t("lobby.host")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    {m.eloRating} • {m.rank}
                  </div>
                </div>
                {m.ready ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Check className="w-3 h-3" />
                    {t("lobby.ready")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/15 border border-gray-500/25 text-gray-300 text-xs">
                    <Hourglass className="w-3 h-3" />
                    {t("lobby.not_ready")}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isHost && (
              <Button
                className={`flex-1 h-11 ${
                  myMember?.ready
                    ? "bg-yellow-600 hover:bg-yellow-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                } text-white font-semibold`}
                onClick={() => setReadyMutation.mutate(!myMember?.ready)}
                disabled={setReadyMutation.isPending}
              >
                {myMember?.ready ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    {t("lobby.unready")}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t("lobby.toggle_ready")}
                  </>
                )}
              </Button>
            )}
            {isHost && (
              <Button
                className="flex-1 h-11 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-primary-foreground font-semibold"
                onClick={() => startMutation.mutate()}
                disabled={!canStart || startMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                {startMutation.isPending
                  ? t("lobby.starting")
                  : t("lobby.start_battle")}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("lobby.leave")}
            </Button>
          </div>

          {/* Status hint */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {!enoughPlayers
              ? t("lobby.need_more")
              : !allReady
                ? t("lobby.waiting_others")
                : t("lobby.all_ready")}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
