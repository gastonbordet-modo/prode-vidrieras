import { z } from "zod";
import { env } from "@/lib/env";

const statusSchema = z.enum([
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "POSTPONED",
  "SUSPENDED",
  "CANCELLED",
  "AWARDED",
]);

const stageSchema = z.enum([
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

const durationSchema = z.enum(["REGULAR", "EXTRA_TIME", "PENALTY_SHOOTOUT"]);

const teamSchema = z.object({
  name: z.string().nullable(),
  crest: z.string().nullable(),
});

const halfScoreSchema = z.object({
  home: z.number().int().nullable(),
  away: z.number().int().nullable(),
});

const scoreSchema = z.object({
  duration: durationSchema,
  fullTime: halfScoreSchema,
  halfTime: halfScoreSchema.optional(),
  extraTime: halfScoreSchema.optional(),
  penalties: halfScoreSchema.optional(),
});

export const apiMatchSchema = z.object({
  id: z.number().int(),
  utcDate: z.iso.datetime({ offset: true }),
  status: statusSchema,
  stage: stageSchema,
  matchday: z.number().int().nullable(),
  group: z.string().nullable(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: scoreSchema,
});

export type ApiMatch = z.infer<typeof apiMatchSchema>;
export type ApiStage = z.infer<typeof stageSchema>;
export type ApiStatus = z.infer<typeof statusSchema>;

const responseSchema = z.object({
  matches: z.array(apiMatchSchema),
});

const URL_MATCHES =
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

export async function fetchAllMatches(): Promise<ApiMatch[]> {
  if (!env.FOOTBALL_DATA_TOKEN) {
    throw new Error("FOOTBALL_DATA_TOKEN no está configurado");
  }

  const res = await fetch(URL_MATCHES, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org devolvió ${res.status}: ${body}`);
  }

  const json: unknown = await res.json();
  return responseSchema.parse(json).matches;
}
