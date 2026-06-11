/**
 * Drizzle schema. Fuente de verdad del modelo de datos.
 * Ver specs/data-model.md para descripción de cada tabla.
 *
 * Las tablas se crean acá en Postgres; los usuarios viven también
 * en `auth.users` de Supabase. `users.id` apunta al uuid de Supabase Auth.
 */

import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    nickname: text("nickname").notNull(),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_nickname_unique").on(t.nickname),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    externalId: integer("external_id").notNull(),
    roundNumber: integer("round_number").notNull(),
    roundName: text("round_name").notNull(),
    isKnockout: boolean("is_knockout").notNull().default(false),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeTeamCrest: text("home_team_crest"),
    awayTeamCrest: text("away_team_crest"),
    groupName: text("group_name"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    penaltyWinner: text("penalty_winner"),
    status: text("status", {
      enum: ["scheduled", "live", "finished", "postponed"],
    })
      .notNull()
      .default("scheduled"),
    originalRoundNumber: integer("original_round_number"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("matches_external_id_unique").on(t.externalId)],
);

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    penaltyWinner: text("penalty_winner"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("predictions_user_match_unique").on(t.userId, t.matchId)],
);

export const scoreAdjustments = pgTable("score_adjustments", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appState = pgTable(
  "app_state",
  {
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key] })],
);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
