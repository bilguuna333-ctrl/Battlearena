import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Sword, Trophy, Crown, User, LogOut, Code2, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRankColor, getRankBg } from "@/lib/utils";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  
  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("codesteppe_token");
        window.location.href = "/";
      }
    });
  };

  return (
    <nav className="border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-primary/20 border border-primary/50 flex items-center justify-center group-hover:bg-primary/30 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                <Sword className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-wider text-white">CodeSteppe</span>
            </Link>
          
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location === '/' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                <div className="flex items-center gap-2"><Home className="w-4 h-4" /> Хянах самбар</div>
              </Link>
            <Link href="/problems" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/problems') ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                <div className="flex items-center gap-2"><Code2 className="w-4 h-4" /> Дасгал</div>
              </Link>
            <Link href="/battle" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/battle') ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                <div className="flex items-center gap-2"><Sword className="w-4 h-4" /> Тулаан</div>
              </Link>
            <Link href="/leaderboard" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location === '/leaderboard' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Тэргүүлэгчид</div>
              </Link>
            <Link href="/seasons" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location === '/seasons' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                <div className="flex items-center gap-2"><Crown className="w-4 h-4" /> Улирал</div>
              </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className={`hidden sm:flex flex-col items-end`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{user.displayName}</span>
                  <div className={`px-2 py-0.5 rounded text-xs border ${getRankColor(user.rank)} ${getRankBg(user.rank)}`}>
                    {user.rank}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span>{user.eloRating} ELO</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/10">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed || user.username}`} alt={user.username} />
                      <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/profile/${user.username}`)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Профайл</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Гарах</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Нэвтрэх</Link>
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.5)]" asChild>
                <Link href="/register">Бүртгүүлэх</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
