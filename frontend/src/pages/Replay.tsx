import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetReplay } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, MessageSquare, CheckCircle2, XCircle, Code2, Flag } from "lucide-react";

type AnyEvent = {
  type: string;
  userId?: number;
  t: number;
  message?: string | null;
  passed?: number | null;
  total?: number | null;
  code?: string | null;
};

const SPEEDS = [0.5, 1, 2, 4];

function fmt(ms: number) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const { data: replay, isLoading } = useGetReplay(id!);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const tickRef = useRef<number | null>(null);
  const lastTs = useRef<number>(Date.now());

  const events: AnyEvent[] = useMemo(() => (replay?.events ?? []) as unknown as AnyEvent[], [replay]);
  const duration = replay?.durationMs ?? events[events.length - 1]?.t ?? 0;
  const players = replay?.players ?? [];

  useEffect(() => {
    if (!playing) return;
    lastTs.current = Date.now();
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTs.current) * speed;
      lastTs.current = now;
      setPos((p) => {
        const np = p + delta;
        if (np >= duration) {
          setPlaying(false);
          return duration;
        }
        return np;
      });
    }, 50);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [playing, speed, duration]);

  const visible = events.filter((e) => e.t <= pos);

  if (isLoading)
    return <div className="container mx-auto p-8 text-gray-400">{t("common.loading")}</div>;
  if (!replay)
    return (
      <div className="container mx-auto p-8 text-gray-400">
        Replay not found.{" "}
        <Link href="/replays" className="text-purple-400 underline">
          {t("common.back")}
        </Link>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{replay.problemTitle ?? `Replay #${id?.slice(0, 8)}`}</h1>
          <p className="text-sm text-gray-400">
            {t("replay.duration")}: {fmt(duration)} • {t("replay.events")}: {events.length}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/replays">{t("common.back")}</Link>
        </Button>
      </div>

      <Card className="border-white/10 bg-card/60">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                if (pos >= duration) setPos(0);
                setPlaying((p) => !p);
              }}
              data-testid="button-replay-play"
              className="bg-purple-500/30 hover:bg-purple-500/40 border border-purple-500/50"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPos(0);
                setPlaying(false);
              }}
              data-testid="button-replay-restart"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="text-sm text-gray-300 font-mono w-24">
              {fmt(pos)} / {fmt(duration)}
            </div>
            <div className="flex-1">
              <Slider
                value={[pos]}
                max={duration || 1}
                step={100}
                onValueChange={(v) => setPos(v[0])}
              />
            </div>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={speed === s ? "default" : "outline"}
                  onClick={() => setSpeed(s)}
                  data-testid={`button-speed-${s}`}
                  className={speed === s ? "bg-purple-500/30 border border-purple-500/50" : ""}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {players.map((p: any, idx: number) => {
          const playerEvents = visible.filter((e) => e.userId === p.userId);
          const accent = idx === 0 ? "border-l-purple-500/60" : "border-l-cyan-500/60";
          return (
            <Card
              key={p.userId}
              className={`border-white/10 bg-card/60 border-l-2 ${accent}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span>{p.displayName ?? p.username}</span>
                  <Badge variant="outline" className="text-xs">
                    {playerEvents.length} үйл явдал
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
                {playerEvents.slice(-30).reverse().map((e, i) => (
                  <EventRow key={`${e.t}-${i}`} ev={e} />
                ))}
                {playerEvents.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Үйл явдал алга</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EventRow({ ev }: { ev: AnyEvent }) {
  const time = fmt(ev.t);
  if (ev.type === "chat") {
    return (
      <div className="flex items-start gap-2 text-sm border-l border-white/10 pl-2">
        <MessageSquare className="w-3 h-3 text-blue-400 mt-1 shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-500">{time}</div>
          <div className="text-gray-300">{ev.message}</div>
        </div>
      </div>
    );
  }
  if (ev.type === "submission") {
    const ok = (ev.passed ?? 0) === (ev.total ?? 0) && (ev.total ?? 0) > 0;
    return (
      <div className="flex items-start gap-2 text-sm border-l border-white/10 pl-2">
        {ok ? (
          <CheckCircle2 className="w-3 h-3 text-green-400 mt-1 shrink-0" />
        ) : (
          <XCircle className="w-3 h-3 text-red-400 mt-1 shrink-0" />
        )}
        <div className="flex-1">
          <div className="text-xs text-gray-500">{time}</div>
          <div className={ok ? "text-green-300" : "text-red-300"}>
            {ev.passed}/{ev.total} тест
          </div>
        </div>
      </div>
    );
  }
  if (ev.type === "forfeit") {
    return (
      <div className="flex items-start gap-2 text-sm border-l border-white/10 pl-2">
        <Flag className="w-3 h-3 text-orange-400 mt-1 shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-500">{time}</div>
          <div className="text-orange-300">Бууж өгсөн</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 text-sm border-l border-white/10 pl-2">
      <Code2 className="w-3 h-3 text-gray-400 mt-1 shrink-0" />
      <div className="flex-1">
        <div className="text-xs text-gray-500">{time}</div>
        <div className="text-gray-300">{ev.type}</div>
      </div>
    </div>
  );
}
