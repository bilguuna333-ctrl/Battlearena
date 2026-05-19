import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRankColor(rank: string | null | undefined): string {
  switch (rank) {
    case "Шинэхэн":
      return "text-zinc-300";
    case "Сурагч":
      return "text-emerald-400";
    case "Кодчин":
      return "text-sky-400";
    case "Ахисан":
      return "text-violet-400";
    case "Мастер":
      return "text-amber-400";
    case "Домог":
      return "text-rose-400";
    default:
      return "text-zinc-300";
  }
}

export function getRankBg(rank: string | null | undefined): string {
  switch (rank) {
    case "Шинэхэн":
      return "bg-zinc-500/10 border-zinc-500/40";
    case "Сурагч":
      return "bg-emerald-500/10 border-emerald-500/40";
    case "Кодчин":
      return "bg-sky-500/10 border-sky-500/40";
    case "Ахисан":
      return "bg-violet-500/10 border-violet-500/40";
    case "Мастер":
      return "bg-amber-500/10 border-amber-500/40";
    case "Домог":
      return "bg-rose-500/10 border-rose-500/40";
    default:
      return "bg-zinc-500/10 border-zinc-500/40";
  }
}

export function getRankGlow(rank: string | null | undefined): string {
  switch (rank) {
    case "Сурагч":
      return "shadow-[0_0_25px_-6px_rgba(16,185,129,0.7)]";
    case "Кодчин":
      return "shadow-[0_0_25px_-6px_rgba(56,189,248,0.7)]";
    case "Ахисан":
      return "shadow-[0_0_25px_-6px_rgba(167,139,250,0.7)]";
    case "Мастер":
      return "shadow-[0_0_30px_-6px_rgba(251,191,36,0.8)]";
    case "Домог":
      return "shadow-[0_0_35px_-4px_rgba(251,113,133,0.85)]";
    default:
      return "";
  }
}

// ELO Level System
// Level 1: 100-500, Level 2: 501-750, Level 3: 751-900, Level 4: 901-1050
// Level 5: 1051-1200, Level 6: 1201-1350, Level 7: 1351-1530
// Level 8: 1531-1750, Level 9: 1751-2000, Level 10: 2001+
const ELO_LEVELS = [
  { level: 1, min: 0, max: 500, color: "#6b7280" },      // gray
  { level: 2, min: 501, max: 750, color: "#22c55e" },    // green
  { level: 3, min: 751, max: 900, color: "#22c55e" },    // green
  { level: 4, min: 901, max: 1050, color: "#eab308" },   // yellow
  { level: 5, min: 1051, max: 1200, color: "#eab308" },  // yellow
  { level: 6, min: 1201, max: 1350, color: "#f97316" },  // orange
  { level: 7, min: 1351, max: 1530, color: "#f97316" },  // orange
  { level: 8, min: 1531, max: 1750, color: "#ef4444" },  // red
  { level: 9, min: 1751, max: 2000, color: "#ef4444" },  // red
  { level: 10, min: 2001, max: 9999, color: "#dc2626" }, // dark red
];

export function getEloLevel(elo: number): { level: number; color: string; progress: number; min: number; max: number } {
  for (const lvl of ELO_LEVELS) {
    if (elo >= lvl.min && elo <= lvl.max) {
      const progress = ((elo - lvl.min) / (lvl.max - lvl.min)) * 100;
      return { level: lvl.level, color: lvl.color, progress, min: lvl.min, max: lvl.max };
    }
  }
  return { level: 10, color: "#dc2626", progress: 100, min: 2001, max: 9999 };
}

export function difficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "Хялбар":
      return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    case "Дунд":
      return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    case "Хэцүү":
      return "text-orange-400 border-orange-500/40 bg-orange-500/10";
    case "Мэргэжлийн":
      return "text-rose-400 border-rose-500/40 bg-rose-500/10";
    default:
      return "text-zinc-300 border-zinc-500/40 bg-zinc-500/10";
  }
}
