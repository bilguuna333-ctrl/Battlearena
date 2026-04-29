import { useGetMe, useGetQueueStatus, useJoinQueue, useCancelQueue, getGetQueueStatusQueryKey, getGetMeQueryKey, useAcceptMatch } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Trophy, Zap, Terminal, Code2, Users, ArrowRight } from "lucide-react";
import { getRankColor, getRankBg } from "@/lib/utils";

export default function Home() {
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: user, isLoading } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!user) {
    return <LandingHero />;
  }

  return <Dashboard user={user} />;
}

function LandingHero() {
  return (
    <div className="flex-1 relative flex flex-col items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none -z-10" />

      <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-300">Монголын хамгийн том кодчиллын тулааны талбар</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
            Код бичиж, <br className="hidden md:block" />
            <span className="text-primary drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">Домог</span> бол
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Бодит цагийн 1-ийн эсрэг 1 тулаанд орж, чансаагаа ахиулан Монголын шилдэг программистуудтай өрсөлдөөрэй.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]" asChild>
              <Link href="/register">Одоо нэгдэх <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-white/20 bg-white/5 hover:bg-white/10" asChild>
              <Link href="/login">Нэвтрэх</Link>
            </Button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full max-w-5xl"
        >
          <FeatureCard 
            icon={<Sword className="w-6 h-6 text-primary" />}
            title="1v1 Тулаан"
            description="Ижил түвшний өрсөлдөгчтэй бодит цагт код бичиж өрсөлдөх"
          />
          <FeatureCard 
            icon={<Trophy className="w-6 h-6 text-yellow-500" />}
            title="Чансааны систем"
            description="Шинэхэнээс эхлээд Домог хүртэл ахиж, ELO оноогоо өсгөх"
          />
          <FeatureCard 
            icon={<Code2 className="w-6 h-6 text-emerald-500" />}
            title="Олон хэлний сонголт"
            description="Python, JavaScript, C++, Java, Go зэрэг хэлүүдээр бодлого бодох"
          />
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-white/5 hover:border-white/10 transition-colors text-left group">
      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Stats Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-white/10 bg-card p-8">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Sword className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed || user.username}`} alt={user.username} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{user.displayName}</h2>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded border font-semibold ${getRankColor(user.rank)} ${getRankBg(user.rank)}`}>
                  {user.rank}
                </div>
                <div className="flex items-center gap-1 text-gray-300 font-medium">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  {user.eloRating} ELO
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <div className="text-sm text-gray-400 mb-1">Ялалт</div>
              <div className="text-2xl font-bold text-emerald-400">{user.battleWins}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Ялагдал</div>
              <div className="text-2xl font-bold text-red-400">{user.battleLosses}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Цуврал</div>
              <div className="text-2xl font-bold text-orange-400">{user.winStreak} 🔥</div>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="rounded-2xl border border-white/10 bg-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Тулаанд орох</h3>
            <p className="text-sm text-gray-400 mb-6">Одоогийн ELO-тойгоо ойролцоо өрсөлдөгчтэй таарах болно.</p>
          </div>
          <Button size="lg" className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]" asChild>
            <Link href="/battle">Тулаан хайх</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
