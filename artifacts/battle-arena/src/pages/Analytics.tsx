import { useGetMyAnalytics } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { BarChart3, Zap, Target as TargetIcon, Code2, Calendar, Tag } from "lucide-react";

const COLORS = ["#a855f7", "#06b6d4", "#f97316", "#eab308", "#ec4899", "#22c55e", "#ef4444"];

function fmtMs(ms: number) {
  if (!ms) return "-";
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

export default function Analytics() {
  const t = useT();
  const { data, isLoading } = useGetMyAnalytics();

  if (isLoading) return <div className="container mx-auto p-8 text-gray-400">{t("common.loading")}</div>;

  const langData = (data?.languageUsage ?? []).map((l: any) => ({ name: l.language, value: l.count }));
  const diffData = (data?.difficultyBreakdown ?? []).map((d: any) => ({ name: d.difficulty, value: d.solved }));
  const tagData = (data?.tagPerformance ?? []).slice(0, 8).map((t2: any) => ({
    name: t2.tag,
    solved: t2.solved,
    accuracy: Math.round((t2.accuracy ?? 0) * 100),
  }));
  const weeklyData = (data?.weeklyActivity ?? []).map((w: any) => ({
    date: w.date.slice(5),
    submissions: w.count,
  }));

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <BarChart3 className="w-6 h-6 text-cyan-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("analytics.title")}</h1>
          <p className="text-gray-400 text-sm">Гүйцэтгэл, идэвх, чадварын дүн шинжилгээ</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          icon={Zap}
          label={t("analytics.solve_speed")}
          value={fmtMs(data?.solveSpeed?.averageMs ?? 0)}
          sub={`${t("analytics.fastest")}: ${fmtMs(data?.solveSpeed?.fastestMs ?? 0)}`}
          color="purple"
        />
        <StatTile
          icon={TargetIcon}
          label={t("analytics.accuracy")}
          value={`${Math.round((data?.accuracy?.overall ?? 0) * 100)}%`}
          sub={`30 өдөр: ${Math.round((data?.accuracy?.last30 ?? 0) * 100)}%`}
          color="cyan"
        />
        <StatTile
          icon={Code2}
          label={t("analytics.languages")}
          value={`${langData.length} хэл`}
          sub={langData[0]?.name ? `Гол: ${langData[0].name}` : ""}
          color="orange"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-300" /> {t("analytics.weekly")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20" }} />
                <Line type="monotone" dataKey="submissions" stroke="#a855f7" strokeWidth={2} dot={{ fill: "#a855f7" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-300" /> {t("analytics.languages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {langData.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">Өгөгдөл алга</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={langData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {langData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <TargetIcon className="w-4 h-4 text-orange-300" /> {t("analytics.difficulty")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diffData.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">Өгөгдөл алга</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={diffData}>
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20" }} />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-pink-300" /> {t("analytics.tags")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tagData.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">Өгөгдөл алга</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tagData} layout="vertical">
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20" }} />
                  <Bar dataKey="solved" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card className={`border-white/10 bg-card/60 border-l-2 border-l-${color}-500/60`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <Icon className={`w-5 h-5 text-${color}-300`} />
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
