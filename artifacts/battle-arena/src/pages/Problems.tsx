import { useListProblems } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Code2, Zap, Trophy, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function Problems() {
  const [difficulty, setDifficulty] = useState<string>("all");
  
  const { data: problems, isLoading } = useListProblems({ 
    difficulty: difficulty !== "all" ? difficulty : undefined 
  });

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case "Хялбар": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Дунд": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Хэцүү": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Мэргэжлийн": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Code2 className="w-8 h-8 text-primary" />
            Дасгалууд
          </h1>
          <p className="text-muted-foreground text-lg">Бодлого бодож ур чадвараа ахиулаарай</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card/50 border border-white/10 p-2 rounded-lg backdrop-blur-sm">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0">
              <SelectValue placeholder="Хэцүү байдал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх бодлогууд</SelectItem>
              <SelectItem value="Хялбар">Хялбар</SelectItem>
              <SelectItem value="Дунд">Дунд</SelectItem>
              <SelectItem value="Хэцүү">Хэцүү</SelectItem>
              <SelectItem value="Мэргэжлийн">Мэргэжлийн</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-card rounded-2xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems?.map((problem, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={problem.id}
            >
              <Link href={`/problems/${problem.slug}`} className="block group">
                  <div className="p-6 rounded-2xl bg-card border border-white/5 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:-translate-y-1 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className={`${getDifficultyColor(problem.difficulty)} font-semibold`}>
                        {problem.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        #{problem.id}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4 line-clamp-2 group-hover:text-primary transition-colors">{problem.title}</h3>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-sm text-yellow-500/80 font-medium">
                          <Zap className="w-4 h-4" /> {problem.eloReward}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-emerald-500/80 font-medium">
                          <Trophy className="w-4 h-4" /> {problem.xpReward} XP
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 hover:text-primary">
                        Бодох
                      </Button>
                    </div>
                  </div>
                </Link>
            </motion.div>
          ))}
          {(!problems || problems.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Бодлого олдсонгүй
            </div>
          )}
        </div>
      )}
    </div>
  );
}
