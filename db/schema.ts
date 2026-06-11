/**
 * Drizzle schema. Fuente de verdad del modelo de datos.
 * Ver specs/data-model.md para descripción de cada tabla.
 *
 * Las tablas se crean acá en Postgres; los usuarios viven también
 * en `auth.users` de Supabase. `users.id` apunta al uuid de Supabase Auth.
 */

import {
  boolean,
  index,
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

/**
 * Apuestas 1X2 sobre un partido. El creador define partido, pick y monto.
 * Ver specs/features/009-bets.md.
 */
export const bets = pgTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    pick: text("pick", { enum: ["home", "draw", "away"] }).notNull(),
    amount: integer("amount").notNull(),
    status: text("status", {
      enum: ["open", "locked", "resolved", "cancelled"],
    })
      .notNull()
      .default("open"),
    // Lado ganador al resolver: 'pro' (coincide con el pick) o 'con'.
    outcome: text("outcome", { enum: ["pro", "con"] }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("bets_match_id_idx").on(t.matchId), index("bets_status_idx").on(t.status)],
);

/**
 * Participación de un usuario en una apuesta. El `side` se deriva de su
 * pronóstico al sumarse y queda congelado (snapshot).
 */
export const betEntries = pgTable(
  "bet_entries",
  {
    id: serial("id").primaryKey(),
    betId: integer("bet_id")
      .notNull()
      .references(() => bets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    side: text("side", { enum: ["pro", "con"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("bet_entries_bet_user_unique").on(t.betId, t.userId),
    index("bet_entries_user_id_idx").on(t.userId),
  ],
);
