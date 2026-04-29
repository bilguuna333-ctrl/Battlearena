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
