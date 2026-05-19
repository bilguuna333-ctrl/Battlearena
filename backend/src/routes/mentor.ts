import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  mentorGroupsTable,
  groupMembersTable,
  assignmentsTable,
  assignmentSubmissionsTable,
  problemsTable,
  usersTable,
} from "@workspace/db";
import { z } from "zod";
import { authMiddleware, type AuthedRequest } from "../lib/auth";
import { rankFromElo } from "../lib/elo";
import { pushNotification } from "../lib/activity";

const router: IRouter = Router();

const CreateGroup = z.object({
  name: z.string().min(2).max(64),
  description: z.string().nullable().optional(),
});
const JoinGroup = z.object({ joinCode: z.string().min(4) });
const CreateAssignment = z.object({
  problemSlug: z.string(),
  title: z.string().min(1).max(120),
  notes: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
const SubmitAssignment = z.object({
  code: z.string().min(1),
  language: z.enum(["javascript", "python"]),
});
const ReviewAssignment = z.object({
  submissionId: z.number().int(),
  score: z.number().int().min(0).max(100),
  note: z.string().max(1000),
});

function genJoinCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

async function loadGroupSummary(group: { id: number; mentorId: number; name: string; description: string | null; joinCode: string }, viewerId: number) {
  const [mentor] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, group.mentorId));
  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    joinCode: group.joinCode,
    isMentor: group.mentorId === viewerId,
    memberCount: members.length,
    mentorUsername: mentor?.username ?? "?",
    mentorDisplayName: mentor?.displayName ?? "?",
  };
}

async function loadGroupDetail(groupId: number, viewerId: number) {
  const [group] = await db
    .select()
    .from(mentorGroupsTable)
    .where(eq(mentorGroupsTable.id, groupId));
  if (!group) return null;
  const [mentor] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, group.mentorId));
  const memberRows = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));
  const memberIds = memberRows.map((m) => m.userId);
  const memberUsers = memberIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(inArray(usersTable.id, memberIds))
    : [];
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.groupId, group.id))
    .orderBy(desc(assignmentsTable.createdAt));
  const allSubs = assignments.length
    ? await db
        .select()
        .from(assignmentSubmissionsTable)
        .where(
          inArray(
            assignmentSubmissionsTable.assignmentId,
            assignments.map((a) => a.id),
          ),
        )
    : [];
  const problemIds = Array.from(new Set(assignments.map((a) => a.problemId)));
  const problems = problemIds.length
    ? await db
        .select()
        .from(problemsTable)
        .where(inArray(problemsTable.id, problemIds))
    : [];
  const probMap = new Map(problems.map((p) => [p.id, p]));
  const userMap = new Map(memberUsers.map((u) => [u.id, u]));

  const completedByUser = new Map<number, number>();
  for (const s of allSubs) {
    if (s.status === "reviewed" || s.status === "submitted") {
      completedByUser.set(
        s.userId,
        (completedByUser.get(s.userId) ?? 0) + 1,
      );
    }
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    joinCode: group.joinCode,
    isMentor: group.mentorId === viewerId,
    mentorUsername: mentor?.username ?? "?",
    mentorDisplayName: mentor?.displayName ?? "?",
    members: memberUsers.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      avatarSeed: u.avatarSeed,
      eloRating: u.eloRating,
      rank: rankFromElo(u.eloRating),
      xp: u.xp,
      completedAssignments: completedByUser.get(u.id) ?? 0,
    })),
    assignments: assignments.map((a) => {
      const subs = allSubs.filter((s) => s.assignmentId === a.id);
      const my = subs.find((s) => s.userId === viewerId) ?? null;
      const myUser = my ? userMap.get(my.userId) : null;
      const prob = probMap.get(a.problemId);
      return {
        id: a.id,
        title: a.title,
        notes: a.notes,
        problemSlug: prob?.slug ?? "",
        problemTitle: prob?.title ?? "",
        createdAt: a.createdAt.toISOString(),
        dueAt: a.dueAt?.toISOString() ?? null,
        submissionsCount: subs.length,
        mySubmission:
          my && (myUser || group.mentorId === viewerId)
            ? {
                id: my.id,
                username: myUser?.username ?? "you",
                displayName: myUser?.displayName ?? "Та",
                status: my.status,
                reviewerScore: my.reviewerScore,
                reviewerNote: my.reviewerNote,
                code: my.code,
                language: my.language,
                createdAt: my.createdAt.toISOString(),
              }
            : null,
      };
    }),
  };
}

router.get(
  "/mentor/groups",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    // Groups where I'm mentor or member
    const owned = await db
      .select()
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.mentorId, req.user.id));
    const memberRows = await db
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, req.user.id));
    const memberGroupIds = memberRows.map((m) => m.groupId);
    const memberGroups = memberGroupIds.length
      ? await db
          .select()
          .from(mentorGroupsTable)
          .where(inArray(mentorGroupsTable.id, memberGroupIds))
      : [];
    const all = [...owned, ...memberGroups];
    const seen = new Set<number>();
    const unique = all.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
    const result = await Promise.all(
      unique.map((g) => loadGroupSummary(g, req.user!.id)),
    );
    res.json(result);
  },
);

router.post(
  "/api/mentor/groups",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = CreateGroup.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    let code = genJoinCode();
    for (let i = 0; i < 5; i++) {
      const [exists] = await db
        .select()
        .from(mentorGroupsTable)
        .where(eq(mentorGroupsTable.joinCode, code));
      if (!exists) break;
      code = genJoinCode();
    }
    const [created] = await db
      .insert(mentorGroupsTable)
      .values({
        mentorId: req.user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        joinCode: code,
      })
      .returning();
    const detail = await loadGroupDetail(created.id, req.user.id);
    res.json(detail);
  },
);

router.get(
  "/api/mentor/groups/:id",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const detail = await loadGroupDetail(id, req.user.id);
    if (!detail) {
      res.status(404).json({ error: "Групп олдсонгүй" });
      return;
    }
    res.json(detail);
  },
);

router.post(
  "/api/mentor/groups/:id/join",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const parsed = JoinGroup.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [g] = await db
      .select()
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.joinCode, parsed.data.joinCode.toUpperCase()));
    if (!g) {
      res.status(404).json({ error: "Групп олдсонгүй" });
      return;
    }
    if (g.mentorId === req.user.id) {
      const detail = await loadGroupDetail(g.id, req.user.id);
      res.json(detail);
      return;
    }
    await db
      .insert(groupMembersTable)
      .values({ groupId: g.id, userId: req.user.id })
      .onConflictDoNothing();
    await pushNotification(
      g.mentorId,
      "group_member_joined",
      `${req.user.displayName} группд нэгдлээ`,
      g.name,
      `/mentor/${g.id}`,
    );
    const detail = await loadGroupDetail(g.id, req.user.id);
    res.json(detail);
  },
);

router.post(
  "/api/mentor/groups/:id/assignments",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const groupId = Number(req.params.id);
    const parsed = CreateAssignment.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [g] = await db
      .select()
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.id, groupId));
    if (!g || g.mentorId !== req.user.id) {
      res.status(403).json({ error: "Зөвшөөрөл байхгүй" });
      return;
    }
    const [problem] = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.slug, parsed.data.problemSlug));
    if (!problem) {
      res.status(404).json({ error: "Дасгал олдсонгүй" });
      return;
    }
    const [a] = await db
      .insert(assignmentsTable)
      .values({
        groupId,
        problemId: problem.id,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      })
      .returning();
    // Notify members
    const members = await db
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId));
    for (const m of members) {
      await pushNotification(
        m.userId,
        "new_assignment",
        `Шинэ даалгавар: ${parsed.data.title}`,
        problem.title,
        `/mentor/${groupId}`,
      );
    }
    res.json({
      id: a.id,
      title: a.title,
      notes: a.notes,
      problemSlug: problem.slug,
      problemTitle: problem.title,
      createdAt: a.createdAt.toISOString(),
      dueAt: a.dueAt?.toISOString() ?? null,
      submissionsCount: 0,
      mySubmission: null,
    });
  },
);

router.post(
  "/api/mentor/assignments/:id/submit",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const parsed = SubmitAssignment.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [a] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, id));
    if (!a) {
      res.status(404).json({ error: "Даалгавар олдсонгүй" });
      return;
    }
    const [g] = await db
      .select()
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.id, a.groupId));
    if (!g) {
      res.status(404).json({ error: "Групп олдсонгүй" });
      return;
    }
    // Must be a member
    const [m] = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, g.id),
          eq(groupMembersTable.userId, req.user.id),
        ),
      );
    if (!m) {
      res.status(403).json({ error: "Группд биш" });
      return;
    }
    // Upsert submission (overwrite previous)
    const [existing] = await db
      .select()
      .from(assignmentSubmissionsTable)
      .where(
        and(
          eq(assignmentSubmissionsTable.assignmentId, id),
          eq(assignmentSubmissionsTable.userId, req.user.id),
        ),
      );
    if (existing) {
      await db
        .update(assignmentSubmissionsTable)
        .set({
          code: parsed.data.code,
          language: parsed.data.language,
          status: "submitted",
        })
        .where(eq(assignmentSubmissionsTable.id, existing.id));
    } else {
      await db.insert(assignmentSubmissionsTable).values({
        assignmentId: id,
        userId: req.user.id,
        code: parsed.data.code,
        language: parsed.data.language,
        status: "submitted",
      });
    }
    await pushNotification(
      g.mentorId,
      "assignment_submitted",
      `${req.user.displayName} даалгавар илгээлээ`,
      a.title,
      `/mentor/${g.id}`,
    );
    res.json({ ok: true });
  },
);

router.post(
  "/api/mentor/assignments/:id/review",
  authMiddleware,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Шаардлагатай" });
      return;
    }
    const id = Number(req.params.id);
    const parsed = ReviewAssignment.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Буруу мэдээлэл" });
      return;
    }
    const [a] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, id));
    if (!a) {
      res.status(404).json({ error: "Даалгавар олдсонгүй" });
      return;
    }
    const [g] = await db
      .select()
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.id, a.groupId));
    if (!g || g.mentorId !== req.user.id) {
      res.status(403).json({ error: "Зөвшөөрөл байхгүй" });
      return;
    }
    const [sub] = await db
      .select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, parsed.data.submissionId));
    if (!sub || sub.assignmentId !== id) {
      res.status(404).json({ error: "Илгээлт олдсонгүй" });
      return;
    }
    await db
      .update(assignmentSubmissionsTable)
      .set({
        status: "reviewed",
        reviewerScore: parsed.data.score,
        reviewerNote: parsed.data.note,
        reviewedAt: new Date(),
      })
      .where(eq(assignmentSubmissionsTable.id, sub.id));
    await pushNotification(
      sub.userId,
      "assignment_reviewed",
      `Багш ${parsed.data.score}/100 оноо өглөө`,
      a.title,
      `/mentor/${g.id}`,
    );
    res.json({ ok: true });
  },
);

void sql;

export default router;
