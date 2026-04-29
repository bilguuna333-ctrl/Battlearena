import { useState } from "react";
import { Link } from "wouter";
import { useGetLeaderboard, GetLeaderboardScope } from "@workspace/api-client-react";
import { Trophy, Flame, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankColor, getRankBg } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [scope, setScope] = useState<GetLeaderboardScope>("global");
  
  const { data: leaderboard, isLoading } = useGetLeaderboard({ scope });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-4 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Тэргүүлэгчид</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          CodeSteppe-ийн шилдэг кодчид. Тулаанд ялж, ELO оноогоо өсгөн шилдгүүдийн жагсаалтад бичигдээрэй.
        </p>
      </div>

      <Tabs value={scope} onValueChange={(v: any) => setScope(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-card/50 p-1 border border-white/5 rounded-xl">
          <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Бүх цаг</TabsTrigger>
          <TabsTrigger value="season" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Улирал</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Сар</TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Долоо хоног</TabsTrigger>
        </TabsList>

        <TabsContent value={scope} className="mt-0">
          <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {isLoading ? (
              <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="w-16 text-center font-bold">#</TableHead>
                    <TableHead>Тоглогч</TableHead>
                    <TableHead className="text-center">Чансаа</TableHead>
                    <TableHead className="text-center">ELO</TableHead>
                    <TableHead className="text-center">Ялалтын хувь</TableHead>
                    <TableHead className="text-center">Цуврал</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard?.map((entry, index) => (
                    <TableRow key={entry.username} className="hover:bg-white/5 border-white/10 transition-colors">
                      <TableCell className="text-center font-bold">
                        {index === 0 ? <Trophy className="w-5 h-5 mx-auto text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" /> : 
                         index === 1 ? <Trophy className="w-5 h-5 mx-auto text-gray-400 drop-shadow-[0_0_8px_rgba(156,163,175,0.8)]" /> :
                         index === 2 ? <Trophy className="w-5 h-5 mx-auto text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]" /> : 
                         <span className="text-muted-foreground">{entry.position}</span>}
                      </TableCell>
                      <TableCell>
                        <Link href={`/profile/${entry.username}`} className="flex items-center gap-3 group">
                            <Avatar className="h-10 w-10 border border-white/10 group-hover:border-primary/50 transition-colors">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.avatarSeed || entry.username}`} />
                              <AvatarFallback>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold group-hover:text-primary transition-colors">{entry.displayName}</div>
                              <div className="text-xs text-muted-foreground">@{entry.username}</div>
                            </div>
                          </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getRankColor(entry.rank)} ${getRankBg(entry.rank)}`}>
                          {entry.rank}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-yellow-500">
                        {entry.eloRating}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {(entry.winRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center font-medium text-orange-400 flex items-center justify-center gap-1">
                        {entry.winStreak > 2 && <Flame className="w-4 h-4 fill-current" />}
                        {entry.winStreak}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!leaderboard || leaderboard.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Мэдээлэл олдсонгүй
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
