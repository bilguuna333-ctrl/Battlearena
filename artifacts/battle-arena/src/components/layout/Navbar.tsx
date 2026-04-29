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
  Sword,
  Trophy,
  Crown,
  User,
  LogOut,
  Code2,
  Home,
  Zap,
  Film,
  Target,
  Users,
  GraduationCap,
  Briefcase,
  Flame,
  BarChart3,
  Bell,
  Globe,
  Coins,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { getRankColor, getRankBg } from "@/lib/utils";
import { useT, useLang } from "@/lib/i18n";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const t = useT();
  const [lang, setLang] = useLang();
  const qc = useQueryClient();
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

  const primaryLinks = [
    { href: "/", icon: Home, key: "nav.home" },
    { href: "/problems", icon: Code2, key: "nav.problems" },
    { href: "/battle", icon: Sword, key: "nav.battle" },
    { href: "/leaderboard", icon: Trophy, key: "nav.leaderboard" },
  ];
  const moreLinks = [
    { href: "/missions", icon: Target, key: "nav.missions" },
    { href: "/replays", icon: Film, key: "nav.replays" },
    { href: "/social", icon: Users, key: "nav.social" },
    { href: "/mentor", icon: GraduationCap, key: "nav.mentor" },
    { href: "/hiring", icon: Briefcase, key: "nav.hiring" },
    { href: "/bosses", icon: Flame, key: "nav.bosses" },
    { href: "/analytics", icon: BarChart3, key: "nav.analytics" },
    { href: "/seasons", icon: Crown, key: "nav.seasons" },
  ];

  return (
    <nav className="border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/50 flex items-center justify-center group-hover:bg-primary/30 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              <Sword className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-wider text-white">CodeSteppe</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {primaryLinks.map((l) => {
              const Icon = l.icon;
              const active = l.href === "/" ? location === "/" : location.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-testid={`link-nav-${l.href.replace(/\//g, "") || "home"}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {t(l.key)}
                  </div>
                </Link>
              );
            })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200" data-testid="button-more-nav">
                  <Menu className="w-4 h-4 mr-1" /> {t("nav.more")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {moreLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <DropdownMenuItem
                      key={l.href}
                      onClick={() => setLocation(l.href)}
                      data-testid={`link-more-${l.href.replace(/\//g, "")}`}
                    >
                      <Icon className="w-4 h-4 mr-2" /> {t(l.key)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            data-testid="button-toggle-lang"
            className="text-gray-300 hover:text-white"
          >
            <Globe className="w-4 h-4 mr-1" />
            {lang.toUpperCase()}
          </Button>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Popover onOpenChange={(o) => o && handleOpenNotif()}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    data-testid="button-notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unread > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-red-500/80 border-0 text-white">
                        {unread > 9 ? "9+" : unread}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <span className="font-semibold text-white">{t("nav.notifications")}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(notifications ?? []).length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-400">
                        Мэдэгдэл алга
                      </p>
                    ) : (
                      (notifications ?? []).slice(0, 10).map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => n.link && setLocation(n.link)}
                          className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                            !n.read ? "bg-purple-500/5" : ""
                          }`}
                          data-testid={`notification-${n.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-white">{n.title}</span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-purple-400 mt-1 shrink-0" />
                            )}
                          </div>
                          {n.body && <p className="text-xs text-gray-400 mt-1">{n.body}</p>}
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{user.displayName}</span>
                  <div
                    className={`px-2 py-0.5 rounded text-xs border ${getRankColor(user.rank)} ${getRankBg(user.rank)}`}
                  >
                    {user.rank}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    {user.eloRating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-300" />
                    {user.coins ?? 0}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full border border-white/10"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed || user.username}`}
                        alt={user.username}
                      />
                      <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                      {user.title && (
                        <p className="text-xs text-pink-300 italic mt-1">"{user.title}"</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/profile/${user.username}`)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("nav.profile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>{t("nav.analytics")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("nav.logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                asChild
              >
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
