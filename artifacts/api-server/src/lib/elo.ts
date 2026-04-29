export const RANK_TIERS = [
  { min: 0, max: 899, name: "Шинэхэн" },
  { min: 900, max: 1199, name: "Сурагч" },
  { min: 1200, max: 1499, name: "Кодчин" },
  { min: 1500, max: 1799, name: "Ахисан" },
  { min: 1800, max: 2099, name: "Мастер" },
  { min: 2100, max: Infinity, name: "Домог" },
] as const;

export function rankFromElo(elo: number): string {
  for (const tier of RANK_TIERS) {
    if (elo >= tier.min && elo <= tier.max) return tier.name;
  }
  return RANK_TIERS[0].name;
}

const K_FACTOR = 32;

export type EloOutcome = "win" | "loss" | "draw";

export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export function computeEloChange(
  playerElo: number,
  opponentElo: number,
  outcome: EloOutcome,
): number {
  const expected = expectedScore(playerElo, opponentElo);
  const actual = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  return Math.round(K_FACTOR * (actual - expected));
}

export function computePairEloChanges(
  player1Elo: number,
  player2Elo: number,
  result: "p1_win" | "p2_win" | "draw",
): { p1: number; p2: number } {
  if (result === "p1_win") {
    return {
      p1: computeEloChange(player1Elo, player2Elo, "win"),
      p2: computeEloChange(player2Elo, player1Elo, "loss"),
    };
  }
  if (result === "p2_win") {
    return {
      p1: computeEloChange(player1Elo, player2Elo, "loss"),
      p2: computeEloChange(player2Elo, player1Elo, "win"),
    };
  }
  return {
    p1: computeEloChange(player1Elo, player2Elo, "draw"),
    p2: computeEloChange(player2Elo, player1Elo, "draw"),
  };
}
