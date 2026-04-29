import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const followsTable = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id").notNull(),
    followingId: integer("following_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("follow_uniq").on(t.followerId, t.followingId),
  }),
);

export type FollowEntry = typeof followsTable.$inferSelect;

export const friendsTable = pgTable(
  "friends",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    friendId: integer("friend_id").notNull(),
    state: text("state").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("friend_uniq").on(t.userId, t.friendId),
  }),
);

export type FriendEntry = typeof friendsTable.$inferSelect;

export const activityFeedTable = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActivityEntry = typeof activityFeedTable.$inferSelect;

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: integer("read").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationEntry = typeof notificationsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  body: text("body").notNull(),
  read: integer("read").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MessageEntry = typeof messagesTable.$inferSelect;
