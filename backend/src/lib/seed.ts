import { db, problemsTable, seasonsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { SEED_PROBLEMS } from "./seed-problems";
import { hashPassword } from "./auth";
import { seedExtras } from "./seed-extras";

const SAMPLE_USERS = [
  { username: "altanbat", displayName: "Алтанбат", elo: 2350, wins: 84, losses: 18, streak: 7, lang: "C++" },
  { username: "saruul", displayName: "Сарууул", elo: 2180, wins: 71, losses: 26, streak: 4, lang: "Python" },
  { username: "munkhjin", displayName: "Мөнхжин", elo: 2050, wins: 62, losses: 28, streak: 0, lang: "JavaScript" },
  { username: "naranbat", displayName: "Наранбат", elo: 1920, wins: 55, losses: 30, streak: 3, lang: "Go" },
  { username: "tsetseg", displayName: "Цэцэг", elo: 1810, wins: 48, losses: 31, streak: 1, lang: "TypeScript" },
  { username: "bilguun", displayName: "Билгүүн", elo: 1690, wins: 41, losses: 35, streak: 0, lang: "Java" },
  { username: "oyunaa", displayName: "Оюун", elo: 1540, wins: 36, losses: 30, streak: 2, lang: "Python" },
  { username: "tumen", displayName: "Түмэн", elo: 1410, wins: 28, losses: 30, streak: 0, lang: "C++" },
  { username: "enkhjin", displayName: "Энхжин", elo: 1280, wins: 22, losses: 25, streak: 1, lang: "JavaScript" },
  { username: "battsetseg", displayName: "Батцэцэг", elo: 1100, wins: 14, losses: 22, streak: 0, lang: "Python" },
  { username: "delgermaa", displayName: "Дэлгэрмаа", elo: 1050, wins: 11, losses: 20, streak: 0, lang: "JavaScript" },
  { username: "khaliun", displayName: "Халиун", elo: 950, wins: 7, losses: 18, streak: 0, lang: "Python" },
];

function rankFromElo(elo: number): string {
  if (elo < 900) return "Шинэхэн";
  if (elo < 1200) return "Сурагч";
  if (elo < 1500) return "Кодчин";
  if (elo < 1800) return "Ахисан";
  if (elo < 2100) return "Мастер";
  return "Домог";
}

export async function seedDatabase(): Promise<void> {
  // Auto-migrate: add columns if they don't exist yet
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`);

  // Upsert problems by slug so existing rows get the latest test cases.
  // We update content fields (test cases, statement, rewards, ...) but
  // preserve the random `solvedCount` so it does not reset every boot.
  for (const p of SEED_PROBLEMS) {
    const [existing] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.slug, p.slug));
    const payload = {
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      statement: p.statement,
      inputDescription: p.inputDescription,
      outputDescription: p.outputDescription,
      constraints: p.constraints,
      examples: p.examples,
      publicTestCases: p.publicTestCases,
      hiddenTestCases: p.hiddenTestCases,
      tags: p.tags,
      starterCode: p.starterCode,
      xpReward: p.xpReward,
      eloReward: p.eloReward,
    };
    if (!existing) {
      await db.insert(problemsTable).values({
        ...payload,
        solvedCount: Math.floor(Math.random() * 200) + 5,
      });
    } else {
      await db
        .update(problemsTable)
        .set(payload)
        .where(eq(problemsTable.id, existing.id));
    }
  }

  // Seed sample users if no users exist
  const existingUsers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);
  if ((existingUsers[0]?.count ?? 0) === 0) {
    const passwordHash = hashPassword("password123");
    for (const u of SAMPLE_USERS) {
      await db.insert(usersTable).values({
        username: u.username,
        displayName: u.displayName,
        passwordHash,
        favoriteLanguage: u.lang,
        eloRating: u.elo,
        highestElo: u.elo + Math.floor(Math.random() * 80),
        battleWins: u.wins,
        battleLosses: u.losses,
        battleDraws: Math.floor(Math.random() * 3),
        winStreak: u.streak,
        xp: u.wins * 50 + u.losses * 10,
        highestRank: rankFromElo(u.elo + 50),
        avatarSeed: u.username,
        bio: `${u.displayName} • CodeSteppe тоглогч`,
      });
    }
  }

  // Seed current season if missing
  const existingSeasons = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seasonsTable);
  if ((existingSeasons[0]?.count ?? 0) === 0) {
    const now = new Date();
    const seasonStart = new Date(now);
    seasonStart.setDate(now.getDate() - 14);
    const seasonEnd = new Date(now);
    seasonEnd.setDate(now.getDate() + 76); // ~90 day season
    await db.insert(seasonsTable).values({
      name: "Улирал 1: Эхлэл",
      startedAt: seasonStart,
      endsAt: seasonEnd,
    });
    // Past season for history
    const past1Start = new Date(seasonStart);
    past1Start.setDate(past1Start.getDate() - 90);
    const past1End = new Date(seasonStart);
    past1End.setDate(past1End.getDate() - 1);
    await db.insert(seasonsTable).values({
      name: "Улирал 0: Бэлтгэл",
      startedAt: past1Start,
      endsAt: past1End,
      champion_user_id: 1,
    });
  }

  await seedExtras();
}
