import { sql, eq } from "drizzle-orm";
import {
  db,
  bossesTable,
  missionsTable,
  hiringChallengesTable,
  problemsTable,
  usersTable,
  mentorGroupsTable,
} from "@workspace/db";
import { hashPassword } from "./auth";

export async function seedExtras(): Promise<void> {
  // Bot user for practice mode
  const [bot] = await db
    .select()
    .from(usersTable)
    .where(sql`${usersTable.username} = 'arena_bot'`);
  if (!bot) {
    await db.insert(usersTable).values({
      username: "arena_bot",
      displayName: "Тулааны Бот",
      passwordHash: hashPassword("__bot__not_loginable__" + Math.random()),
      eloRating: 1000,
      highestElo: 1000,
      isBot: 1,
      avatarSeed: "arena_bot",
      bio: "AI өрсөлдөгч — Дадлагын горимд",
      title: "Бот",
    });
  }

  // Company user accounts
  const companies = [
    {
      username: "ulaanbaator_software",
      displayName: "Улаанбаатор Software",
      bio: "Mongolian software engineering company. Hiring elite developers.",
    },
    {
      username: "khan_tech",
      displayName: "Khan Tech",
      bio: "Modern fintech building Mongolia's digital economy.",
    },
  ];
  for (const c of companies) {
    const [exists] = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.username} = ${c.username}`);
    if (!exists) {
      await db.insert(usersTable).values({
        username: c.username,
        displayName: c.displayName,
        passwordHash: hashPassword("__company__" + Math.random()),
        bio: c.bio,
        avatarSeed: c.username,
        isCompany: 1,
        title: "Компани",
        eloRating: 1500,
        highestElo: 1500,
      });
    }
  }

  // Missions
  const [missionCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(missionsTable);
  if ((missionCount?.c ?? 0) === 0) {
    await db.insert(missionsTable).values([
      {
        slug: "daily-solve-3",
        title: "3 бодлого бод",
        titleEn: "Solve 3 problems",
        description: "Өнөөдөр 3 бодлого бод.",
        descriptionEn: "Solve 3 problems today.",
        period: "daily",
        goalType: "solve_any",
        goalCount: 3,
        rewardXp: 60,
        rewardCoins: 30,
        icon: "code",
      },
      {
        slug: "daily-win-2",
        title: "2 тулаанд ял",
        titleEn: "Win 2 battles",
        description: "Өнөөдөр 2 тулаанд ял.",
        descriptionEn: "Win 2 battles today.",
        period: "daily",
        goalType: "battle_win",
        goalCount: 2,
        rewardXp: 80,
        rewardCoins: 40,
        icon: "swords",
      },
      {
        slug: "daily-hard",
        title: "1 хэцүү бодлого бод",
        titleEn: "Solve 1 hard problem",
        description: "Хэцүү түвшний бодлого бод.",
        descriptionEn: "Solve a hard difficulty problem.",
        period: "daily",
        goalType: "solve_difficulty",
        goalParams: JSON.stringify({ difficulty: "Хэцүү" }),
        goalCount: 1,
        rewardXp: 100,
        rewardCoins: 50,
        icon: "flame",
      },
      {
        slug: "weekly-solve-15",
        title: "Долоо хоногт 15 бодлого бод",
        titleEn: "Solve 15 problems weekly",
        description: "Долоо хоногт 15 бодлого бод.",
        descriptionEn: "Solve 15 problems this week.",
        period: "weekly",
        goalType: "solve_any",
        goalCount: 15,
        rewardXp: 250,
        rewardCoins: 150,
        rewardBadge: "weekly_grinder",
        icon: "trophy",
      },
      {
        slug: "weekly-win-10",
        title: "Долоо хоногт 10 тулаанд ял",
        titleEn: "Win 10 battles weekly",
        description: "Долоо хоногт 10 тулаанд ял.",
        descriptionEn: "Win 10 battles this week.",
        period: "weekly",
        goalType: "battle_win",
        goalCount: 10,
        rewardXp: 300,
        rewardCoins: 200,
        rewardBadge: "battle_master",
        icon: "crown",
      },
      {
        slug: "weekly-boss",
        title: "1 Бөх дайс ялагт",
        titleEn: "Defeat 1 boss",
        description: "Долоо хоногт 1 Бөх дайс яла.",
        descriptionEn: "Defeat at least 1 boss this week.",
        period: "weekly",
        goalType: "boss_defeated",
        goalCount: 1,
        rewardXp: 200,
        rewardCoins: 100,
        rewardBadge: "boss_slayer",
        icon: "shield",
      },
    ]);
  }

  // Bosses
  const [bossCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(bossesTable);
  if ((bossCount?.c ?? 0) === 0) {
    const allProblems = await db
      .select({ id: problemsTable.id, difficulty: problemsTable.difficulty })
      .from(problemsTable);
    const easy = allProblems.filter((p) => p.difficulty === "Хялбар").map((p) => p.id);
    const medium = allProblems.filter((p) => p.difficulty === "Дунд").map((p) => p.id);
    const hard = allProblems.filter((p) => p.difficulty === "Хэцүү").map((p) => p.id);
    const pick = (arr: number[], n: number) => arr.slice(0, Math.min(n, arr.length));
    await db.insert(bossesTable).values([
      {
        slug: "binary-tree-titan",
        name: "Хоёртын Модны Аварга",
        nameEn: "Binary Tree Titan",
        title: "Эртний Аварга",
        titleEn: "Ancient Titan",
        description: "Хоёртын модыг сүйтгэгч аварга. 3 шатлалт тулаан.",
        descriptionEn: "Ancient titan that crushes binary trees. 3-stage battle.",
        difficulty: "Хялбар",
        maxHp: 300,
        problemIds: pick([...easy, ...medium], 3),
        rewardXp: 300,
        rewardCoins: 150,
        rewardTitle: "Аваргын Эзэн",
        artColor: "purple",
        icon: "shield",
      },
      {
        slug: "dragon-algorithm",
        name: "Алгоритмын Луу",
        nameEn: "Dragon Algorithm",
        title: "Галт Луу",
        titleEn: "Fire Dragon",
        description: "Шатааж буй кодын галт луу. 4 шатлалт хүнд тулаан.",
        descriptionEn: "Code-breathing fire dragon. 4-stage hard battle.",
        difficulty: "Дунд",
        maxHp: 500,
        problemIds: pick([...medium, ...medium], 4),
        rewardXp: 600,
        rewardCoins: 350,
        rewardTitle: "Луу Алагч",
        artColor: "orange",
        icon: "flame",
      },
      {
        slug: "dp-king",
        name: "Динамик Программчилалын Хаан",
        nameEn: "Dynamic Programming King",
        title: "Хаан Дайс",
        titleEn: "King Boss",
        description: "DP-ын эзэн хаан. 5 шатлалт хамгийн хүнд тулаан.",
        descriptionEn: "Lord of dynamic programming. The hardest 5-stage battle.",
        difficulty: "Хэцүү",
        maxHp: 800,
        problemIds: pick([...hard, ...hard, ...medium], 5),
        rewardXp: 1200,
        rewardCoins: 700,
        rewardTitle: "Хааныг Унагаагч",
        artColor: "red",
        icon: "crown",
      },
    ]);
  }

  const [shadowLord] = await db
    .select()
    .from(bossesTable)
    .where(eq(bossesTable.slug, "code-shadow-lord"));
  
  if (!shadowLord) {
    const [pEasy] = await db.select({ id: problemsTable.id }).from(problemsTable).where(eq(problemsTable.slug, "two-sum-numbers"));
    const [pMedium] = await db.select({ id: problemsTable.id }).from(problemsTable).where(eq(problemsTable.slug, "fibonacci"));
    const [pHard] = await db.select({ id: problemsTable.id }).from(problemsTable).where(eq(problemsTable.slug, "max-subarray"));

    const easyId = pEasy?.id ?? 1;
    const mediumId = pMedium?.id ?? 9;
    const hardId = pHard?.id ?? 13;

    await db.insert(bossesTable).values({
      slug: "code-shadow-lord",
      name: "Сүүдрийн Эзэн (Shadow Lord)",
      nameEn: "Code Shadow Lord",
      title: "Сүүдрийн Кодчин",
      titleEn: "Shadow Coder",
      description: "3 өөр чадвартай (Skill), тус бүр өөр түвшний бодлоготой тусгай босс. Чадвар 1 (Хялбар), Чадвар 2 (Дунд), Чадвар 3 (Хэцүү).",
      descriptionEn: "Special boss with 3 skills mapping to different problem difficulties (Easy, Medium, Hard).",
      difficulty: "Тусгай",
      maxHp: 1000,
      problemIds: [easyId, mediumId, hardId],
      rewardXp: 1500,
      rewardCoins: 800,
      rewardTitle: "Сүүдрийг Дарагч",
      artColor: "red",
      icon: "skull",
    });
  }

  // Hiring challenges
  const [challengeCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(hiringChallengesTable);
  if ((challengeCount?.c ?? 0) === 0) {
    const allProblems = await db
      .select({ id: problemsTable.id, difficulty: problemsTable.difficulty })
      .from(problemsTable);
    const challenge1Ids = allProblems.slice(0, 3).map((p) => p.id);
    const challenge2Ids = allProblems
      .filter((p) => p.difficulty !== "Хялбар")
      .slice(0, 3)
      .map((p) => p.id);

    const [c1] = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.username} = 'ulaanbaator_software'`);
    const [c2] = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.username} = 'khan_tech'`);

    if (c1) {
      await db.insert(hiringChallengesTable).values({
        companyId: c1.id,
        title: "Backend Engineer ажилтан 2026",
        description:
          "Бид 3 алгоритм бодлого өгч, шилдэг 5 хүнийг ярилцлагад урих болно. Шалгалт нь 3 цаг үргэлжилнэ.",
        problemIds: challenge1Ids,
        positions: 5,
      });
    }
    if (c2) {
      await db.insert(hiringChallengesTable).values({
        companyId: c2.id,
        title: "Senior Full-Stack Developer",
        description:
          "Хатуу хувилбар тулааны үндсэн дээр чанартай шийдвэр гаргадаг хүнийг сонгож байна.",
        problemIds: challenge2Ids,
        positions: 3,
      });
    }
  }

  // Mentor groups (demo)
  const [groupCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(mentorGroupsTable);
  if ((groupCount?.c ?? 0) === 0) {
    const [mentor] = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.username} = 'altanbat'`);
    if (mentor) {
      await db.insert(mentorGroupsTable).values({
        mentorId: mentor.id,
        name: "Алтанбатын дасгалжуулагчийн групп",
        description: "Эхлэн сурагчдад зориулсан долоо хоногийн дасгал.",
        joinCode: "MENTOR1",
      });
    }
  }
}
