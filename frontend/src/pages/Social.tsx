import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetActivityFeed,
  useGetFriends,
  useAcceptFriendRequest,
  useSendFriendRequest,
  getGetFriendsQueryKey,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, MessageCircle, Search, X, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FriendStatus = "playing" | "online" | "offline";

function getRandomStatus(): FriendStatus {
  const rand = Math.random();
  if (rand < 0.1) return "playing";
  if (rand < 0.3) return "online";
  return "offline";
}

function getPlayingActivity(): string {
  const activities = ["Battle Arena", "Boss Fight", "Бодлого бодож байна", "Ranked Match"];
  const mins = Math.floor(Math.random() * 60);
  return `${activities[Math.floor(Math.random() * activities.length)]} (${mins}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")})`;
}

export default function Social() {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("codesteppe_token") : null;
  const { data: me } = useGetMe({ query: { enabled: !!token, retry: false, queryKey: getGetMeQueryKey() } });
  const { data: friends, isLoading: isFriendsLoading } = useGetFriends();
  const sendReq = useSendFriendRequest();
  const acceptReq = useAcceptFriendRequest();
  
  const [activeTab, setActiveTab] = useState<"friends" | "chats">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [addFriendMode, setAddFriendMode] = useState(false);
  const [target, setTarget] = useState("");

  const accepted = (friends?.friends ?? []) as any[];
  const pending = (friends?.incoming ?? []) as any[];

  // Simulate online status for friends (in real app, this would come from backend)
  const friendsWithStatus = useMemo(() => {
    return accepted.map((f: any) => ({
      ...f,
      status: getRandomStatus(),
      activity: getPlayingActivity(),
    }));
  }, [accepted]);

  // Group friends by status
  const playingFriends = friendsWithStatus.filter(f => f.status === "playing");
  const onlineFriends = friendsWithStatus.filter(f => f.status === "online");
  const offlineFriends = friendsWithStatus.filter(f => f.status === "offline");

  // Filter by search
  const filterBySearch = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(f => 
      f.username?.toLowerCase().includes(q) || 
      f.displayName?.toLowerCase().includes(q)
    );
  };

  const handleSend = () => {
    if (!target.trim()) return;
    sendReq.mutate(
      { data: { username: target.trim() } },
      {
        onSuccess: () => {
          toast({ title: t("social.request_sent") });
          setTarget("");
          setAddFriendMode(false);
          qc.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        },
        onError: () => toast({ title: t("social.request_failed"), variant: "destructive" }),
      },
    );
  };

  const handleAccept = (username: string) => {
    acceptReq.mutate(
      { data: { username } },
      {
        onSuccess: () => {
          toast({ title: t("social.now_friends") });
          qc.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        },
      },
    );
  };

  const StatusDot = ({ status }: { status: FriendStatus }) => (
    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${
      status === "playing" ? "bg-orange-500" :
      status === "online" ? "bg-green-500" : "bg-gray-500"
    }`} />
  );

  const FriendItem = ({ friend, showActivity = false }: { friend: any; showActivity?: boolean }) => (
    <div 
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => setLocation(`/messages/${friend.username}`)}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={friend.avatarUrl || ""} />
          <AvatarFallback className="bg-gray-700 text-gray-300">{friend.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <StatusDot status={friend.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">{friend.displayName || friend.username}</div>
        {showActivity && friend.status === "playing" && (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span className="text-orange-400">●</span> Playing • {friend.activity}
          </div>
        )}
      </div>
    </div>
  );

  const FriendSection = ({ title, count, friends, showActivity = false }: { 
    title: string; 
    count: number; 
    friends: any[];
    showActivity?: boolean;
  }) => {
    const filtered = filterBySearch(friends);
    if (filtered.length === 0 && searchQuery) return null;
    
    return (
      <div className="mb-2">
        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title} ({filtered.length})
        </div>
        <div className="divide-y divide-white/5">
          {filtered.map((friend) => (
            <FriendItem key={friend.username} friend={friend} showActivity={showActivity} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Social</h2>
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => setAddFriendMode(!addFriendMode)}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => setLocation("/")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === "friends" 
                ? "text-orange-500 border-b-2 border-orange-500" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === "chats" 
                ? "text-orange-500 border-b-2 border-orange-500" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Chats
          </button>
        </div>

        {/* Add Friend Input */}
        {addFriendMode && (
          <div className="p-3 border-b border-white/10 bg-black/20">
            <div className="flex gap-2">
              <Input
                placeholder="Хэрэглэгчийн нэр..."
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="bg-[#111] border-white/10 h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button 
                size="sm"
                onClick={handleSend}
                disabled={sendReq.isPending || !target.trim()}
                className="bg-orange-500 hover:bg-orange-600 h-9 px-3"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pending.length > 0 && (
          <div className="border-b border-white/10 bg-orange-500/5">
            <div className="px-4 py-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              Хүсэлтүүд ({pending.length})
            </div>
            {pending.map((f: any) => (
              <div key={f.username} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={f.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-700 text-xs">{f.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm font-medium text-white truncate">{f.displayName || f.username}</div>
                <Button
                  size="icon"
                  onClick={() => handleAccept(f.username)}
                  className="h-7 w-7 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111] border-white/10 pl-9 h-9 text-sm placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {activeTab === "friends" ? (
            isFriendsLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            ) : accepted.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-500 text-sm">Найз байхгүй байна</p>
                <Button 
                  size="sm" 
                  className="mt-3 bg-orange-500 hover:bg-orange-600"
                  onClick={() => setAddFriendMode(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Найз нэмэх
                </Button>
              </div>
            ) : (
              <>
                {playingFriends.length > 0 && (
                  <FriendSection title="Playing" count={playingFriends.length} friends={playingFriends} showActivity />
                )}
                {onlineFriends.length > 0 && (
                  <FriendSection title="Online" count={onlineFriends.length} friends={onlineFriends} />
                )}
                {offlineFriends.length > 0 && (
                  <FriendSection title="Offline" count={offlineFriends.length} friends={offlineFriends} />
                )}
              </>
            )
          ) : (
            // Chats tab
            <div className="py-16 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Чат байхгүй байна</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
