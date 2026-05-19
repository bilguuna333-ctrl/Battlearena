import {
  useGetMe,
  useLogout,
  useSetLanguage,
  useGetNotifications,
  useMarkAllNotificationsRead,
  getGetMeQueryKey,
  getGetNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  BarChart3,
  Globe,
  Trophy,
  Settings,
  MoreHorizontal,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useT, useLang } from "@/lib/i18n";
import { useState } from "react";

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  return "just now";
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const t = useT();
  const [lang, setLang] = useLang();
  const qc = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;

  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() },
  });

  const logout = useLogout();
  const setLanguage = useSetLanguage();
  const { data: notifications } = useGetNotifications({
    query: {
      enabled: !!user,
      refetchInterval: 15000,
      queryKey: getGetNotificationsQueryKey(),
    },
  });
  const markRead = useMarkAllNotificationsRead();
  const unread = (notifications ?? []).filter((n: any) => !n.read).length;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("codesteppe_token");
        window.location.href = "/";
      },
    });
  };

  const toggleLang = () => {
    const next = lang === "mn" ? "en" : "mn";
    setLang(next);
    if (user) {
      setLanguage.mutate(
        { data: { language: next } },
        {
          onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
        },
      );
    }
  };

  const handleOpenNotif = () => {
    if (unread > 0) {
      markRead.mutate(undefined, {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
      });
    }
  };

  return (
    <nav className="h-12 bg-[#282828] border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-50 text-sm font-sans">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          {/* Logo icon matching LeetCode shape, using an orange styled span or svg */}
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-500 transform -rotate-45">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-white tracking-wide text-[15px]">CodeSteppe</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-1">
          <Link href="/problems">
            <span className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${location.startsWith('/problems') ? 'text-orange-400' : 'text-gray-400 hover:text-white'}`}>
              {t("nav.problems")}
            </span>
          </Link>
          <Link href="/battle">
            <span className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${location.startsWith('/battle') ? 'text-orange-400' : 'text-gray-400 hover:text-white'}`}>
              {t("nav.battle")}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={t("common.search")}
            className="bg-white/10 border-none rounded pl-8 pr-3 py-1 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:bg-white/20 w-48 transition-colors"
          />
        </div>

        {/* Auth / User Section */}
        {isLoading ? (
          <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <Popover onOpenChange={(o) => o && handleOpenNotif()}>
              <PopoverTrigger className="relative text-gray-400 hover:text-white transition-colors outline-none">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[#282828]"></span>
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[420px] p-0 bg-[#1a1a1a] border-[#333] rounded-lg shadow-2xl text-white overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto">
                  {(notifications ?? []).length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">
                      {t("nav.notifications_empty")}
                    </p>
                  ) : (
                    (notifications ?? []).slice(0, 15).map((n: any, idx: number) => (
                      <button
                        key={n.id}
                        onClick={() => n.link && setLocation(n.link)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04] ${
                          idx !== 0 ? "border-t border-[#2a2a2a]" : ""
                        } ${!n.read ? "bg-white/[0.03]" : ""}`}
                      >
                        {/* Trophy icon */}
                        <div className="shrink-0 mt-0.5">
                          <Trophy className="w-5 h-5 text-orange-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-300 leading-snug">
                            <span>{n.title}</span>
                            {n.body && (
                              <span className="text-gray-500"> {n.body}</span>
                            )}
                            {n.link && (
                              <span className="text-blue-400 hover:text-blue-300 ml-1 cursor-pointer">
                                {lang === "mn" ? "Энд дар!" : "Join here!"}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Time ago */}
                        <span className="shrink-0 text-xs text-gray-600 whitespace-nowrap mt-0.5">
                          {timeAgo(new Date(n.createdAt))}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Bottom settings bar */}
                <div className="border-t border-[#2a2a2a] px-4 py-2.5 flex items-center justify-between">
                  <button className="text-gray-500 hover:text-gray-300 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-300 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none flex items-center">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={(user as any).avatarUrl || (user.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}` : "")} alt={user.username} />
                  <AvatarFallback className="bg-gray-600 text-[10px] text-white">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#282828] border-white/10 text-gray-300" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">{user.displayName}</p>
                    <p className="text-xs leading-none text-gray-400">@{user.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => setLocation(`/profile/${user.username}`)} className="hover:bg-white/10 hover:text-white cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("nav.profile")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/analytics")} className="hover:bg-white/10 hover:text-white cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>{t("nav.analytics")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleLang} className="hover:bg-white/10 hover:text-white cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" />
                  <span>{lang.toUpperCase()}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-white/10 hover:text-white cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors">
               <Globe className="w-3.5 h-3.5" /> {lang.toUpperCase()}
            </button>
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
              {t("auth.login")}
            </Link>
            <Link href="/register" className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
              {t("auth.register")}
            </Link>
          </div>
        )}
      </div>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden text-gray-400 hover:text-white p-1"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-12 left-0 right-0 bg-[#282828] border-b border-white/10 md:hidden z-50">
          <div className="flex flex-col p-4 gap-3 text-gray-300">
            <Link href="/problems" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/problems') ? 'text-white' : ''}`}>
              {t("nav.problems")}
            </Link>
            <Link href="/battle" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/battle') ? 'text-white' : ''}`}>
              {t("nav.battle")}
            </Link>
            <Link href="/leaderboard" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/leaderboard') ? 'text-white' : ''}`}>
              {t("nav.leaderboard")}
            </Link>
            <Link href="/social" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/social') ? 'text-white' : ''}`}>
              {t("nav.social")}
            </Link>
            <Link href="/missions" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/missions') ? 'text-white' : ''}`}>
              {t("nav.missions")}
            </Link>
            <Link href="/bosses" onClick={() => setMobileMenuOpen(false)} className={`py-2 ${location.startsWith('/bosses') ? 'text-white' : ''}`}>
              {t("nav.bosses")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
