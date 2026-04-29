import { useEffect, useState, useCallback } from "react";

export type Lang = "mn" | "en";

const STORAGE_KEY = "codesteppe_lang";

type Dict = Record<string, { mn: string; en: string }>;

export const T: Dict = {
  // Nav
  "nav.home": { mn: "Хянах самбар", en: "Dashboard" },
  "nav.problems": { mn: "Дасгал", en: "Problems" },
  "nav.battle": { mn: "Тулаан", en: "Battle" },
  "nav.leaderboard": { mn: "Тэргүүлэгчид", en: "Leaderboard" },
  "nav.seasons": { mn: "Улирал", en: "Seasons" },
  "nav.replays": { mn: "Видео", en: "Replays" },
  "nav.missions": { mn: "Даалгавар", en: "Missions" },
  "nav.social": { mn: "Найзууд", en: "Social" },
  "nav.mentor": { mn: "Багш", en: "Mentor" },
  "nav.hiring": { mn: "Ажил", en: "Hiring" },
  "nav.bosses": { mn: "Бөос", en: "Boss" },
  "nav.analytics": { mn: "Шинжилгээ", en: "Analytics" },
  "nav.more": { mn: "Бусад", en: "More" },
  "nav.login": { mn: "Нэвтрэх", en: "Login" },
  "nav.register": { mn: "Бүртгүүлэх", en: "Register" },
  "nav.logout": { mn: "Гарах", en: "Logout" },
  "nav.profile": { mn: "Профайл", en: "Profile" },
  "nav.notifications": { mn: "Мэдэгдэл", en: "Notifications" },
  // Replays
  "replay.title": { mn: "Тулааны видео", en: "Battle Replays" },
  "replay.subtitle": { mn: "Сүүлийн тулаануудаа дахин үзээрэй", en: "Watch your past battles" },
  "replay.empty": { mn: "Видео алга байна. Тулаанд оролц!", en: "No replays yet. Join a battle!" },
  "replay.duration": { mn: "Үргэлжлэл", en: "Duration" },
  "replay.events": { mn: "Үйл явдал", en: "Events" },
  "replay.play": { mn: "Тоглуулах", en: "Play" },
  "replay.pause": { mn: "Зогсоох", en: "Pause" },
  "replay.restart": { mn: "Дахих", en: "Restart" },
  "replay.speed": { mn: "Хурд", en: "Speed" },
  // Missions
  "mission.title": { mn: "Өдөр тутмын даалгавар", en: "Missions" },
  "mission.subtitle": { mn: "Шагнал хүртэхийн тулд биелүүл", en: "Complete to earn rewards" },
  "mission.daily": { mn: "Өдөр тутмын", en: "Daily" },
  "mission.weekly": { mn: "Долоо хоног тутмын", en: "Weekly" },
  "mission.claim": { mn: "Хүлээн авах", en: "Claim" },
  "mission.claimed": { mn: "Хүлээн авсан", en: "Claimed" },
  "mission.progress": { mn: "Явц", en: "Progress" },
  "mission.reward": { mn: "Шагнал", en: "Reward" },
  // Social
  "social.feed": { mn: "Үйл явдал", en: "Activity Feed" },
  "social.friends": { mn: "Найзууд", en: "Friends" },
  "social.followers": { mn: "Дагагчид", en: "Followers" },
  "social.following": { mn: "Дагасан", en: "Following" },
  "social.requests": { mn: "Хүсэлт", en: "Requests" },
  "social.empty_feed": { mn: "Найзуудаа дагаж эхэл!", en: "Follow friends to see activity!" },
  "social.no_friends": { mn: "Найз алга байна", en: "No friends yet" },
  "social.send_message": { mn: "Илгээх", en: "Send" },
  "social.message_placeholder": { mn: "Зурвас бичих...", en: "Type a message..." },
  // Mentor
  "mentor.groups": { mn: "Багшийн бүлгүүд", en: "Mentor Groups" },
  "mentor.create": { mn: "Бүлэг үүсгэх", en: "Create Group" },
  "mentor.join": { mn: "Бүлэгт нэгдэх", en: "Join Group" },
  "mentor.join_code": { mn: "Нэгдэх код", en: "Join Code" },
  "mentor.assignments": { mn: "Даалгавар", en: "Assignments" },
  "mentor.members": { mn: "Гишүүд", en: "Members" },
  // Hiring
  "hiring.title": { mn: "Ажилд авах талбар", en: "Hiring Arena" },
  "hiring.subtitle": { mn: "Кодынхоо чадвараар компаний анхаарлыг тат", en: "Get noticed by companies through code" },
  "hiring.apply": { mn: "Өргөдөл гаргах", en: "Apply" },
  "hiring.applied": { mn: "Өргөдөл гаргасан", en: "Applied" },
  "hiring.positions": { mn: "Сул орон тоо", en: "Positions" },
  "hiring.applicants": { mn: "Өргөдөл гаргагч", en: "Applicants" },
  "hiring.leaderboard": { mn: "Шилдэг өргөдөл", en: "Top Applicants" },
  // Boss
  "boss.title": { mn: "Бөсстэй тулаан", en: "Boss Battles" },
  "boss.subtitle": { mn: "Олон шатлалт тулааны эзэн нь хэн бэ?", en: "Conquer multi-stage challenges" },
  "boss.start": { mn: "Тулаан эхлүүлэх", en: "Start Fight" },
  "boss.continue": { mn: "Үргэлжлүүлэх", en: "Continue" },
  "boss.defeated": { mn: "Дийлсэн", en: "Defeated" },
  "boss.combo": { mn: "Цуврал", en: "Combo" },
  "boss.attack": { mn: "Довтлох", en: "Attack" },
  "boss.forfeit": { mn: "Бууж өгөх", en: "Forfeit" },
  "boss.player_hp": { mn: "Таны HP", en: "Your HP" },
  "boss.boss_hp": { mn: "Бөссийн HP", en: "Boss HP" },
  // Analytics
  "analytics.title": { mn: "Гүнзгий шинжилгээ", en: "Advanced Analytics" },
  "analytics.solve_speed": { mn: "Бодох хурд", en: "Solve Speed" },
  "analytics.accuracy": { mn: "Үнэн зөв байдал", en: "Accuracy" },
  "analytics.languages": { mn: "Хэлийн ашиглалт", en: "Languages" },
  "analytics.difficulty": { mn: "Түвшин", en: "Difficulty" },
  "analytics.tags": { mn: "Сэдэв", en: "Topics" },
  "analytics.weekly": { mn: "Долоо хоногийн идэвх", en: "Weekly Activity" },
  "analytics.average": { mn: "Дундаж", en: "Average" },
  "analytics.fastest": { mn: "Хамгийн хурдан", en: "Fastest" },
  // Common
  "common.loading": { mn: "Уншиж байна...", en: "Loading..." },
  "common.cancel": { mn: "Болих", en: "Cancel" },
  "common.save": { mn: "Хадгалах", en: "Save" },
  "common.create": { mn: "Үүсгэх", en: "Create" },
  "common.send": { mn: "Илгээх", en: "Send" },
  "common.back": { mn: "Буцах", en: "Back" },
  "common.coins": { mn: "Зоос", en: "Coins" },
  "common.xp": { mn: "Туршлага", en: "XP" },
  "common.elo": { mn: "ELO", en: "ELO" },
};

const listeners = new Set<() => void>();
let current: Lang =
  (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Lang | null)) || "mn";

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  listeners.forEach((fn) => fn());
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [current, setLang];
}

export function useT() {
  const [lang] = useLang();
  return useCallback(
    (key: string, fallback?: string) => {
      const entry = T[key];
      if (!entry) return fallback ?? key;
      return entry[lang] ?? entry.mn ?? fallback ?? key;
    },
    [lang],
  );
}

export function tr(key: string, lang: Lang = current, fallback?: string): string {
  const entry = T[key];
  if (!entry) return fallback ?? key;
  return entry[lang] ?? entry.mn ?? fallback ?? key;
}
