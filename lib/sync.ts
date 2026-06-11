import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appState, matches } from "@/db/schema";
import { resolveFinishedBets } from "@/lib/bets";
import {
  fetchAllMatches,
  type ApiMatch,
  type ApiStage,
  type ApiStatus,
} from "@/lib/football-data";

type StageInfo = { number: number; name: string; isKnockout: boolean };

const KNOCKOUT_STAGES: Record<Exclude<ApiStage, "GROUP_STAGE">, StageInfo> = {
  LAST_32: { number: 4, name: "16avos de final", isKnockout: true },
  LAST_16: { number: 5, name: "Octavos de final", isKnockout: true },
  QUARTER_FINALS: { number: 6, name: "Cuartos de final", isKnockout: true },
  SEMI_FINALS: { number: 7, name: "Semifinal", isKnockout: true },
  THIRD_PLACE: { number: 8, name: "Tercer puesto", isKnockout: true },
  FINAL: { number: 9, name: "Final", isKnockout: true },
};

export function deriveRound(
  stage: ApiStage,
  matchday: number | null,
): StageInfo {
  if (stage === "GROUP_STAGE") {
    if (matchday === null || matchday < 1 || matchday > 3) {
      throw new Error(`Matchday inválido para GROUP_STAGE: ${matchday}`);
    }
    return {
      number: matchday,
      name: `Fase de grupos - Fecha ${matchday}`,
      isKnockout: false,
    };
  }
  return KNOCKOUT_STAGES[stage];
}

export function mapStatus(
  s: ApiStatus,
): "scheduled" | "live" | "finished" | "postponed" {
  switch (s) {
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
    case "AWARDED":
      return "postponed";
  }
}

export type MappedMatch = {
  externalId: number;
  roundNumber: number;
  roundName: string;
  isKnockout: boolean;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
  groupName: string | null;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: string | null;
  status: "scheduled" | "live" | "finished" | "postponed";
};

export function mapMatch(raw: ApiMatch): MappedMatch {
  const round = deriveRound(raw.stage, raw.matchday);

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let penaltyWinner: string | null = null;

  if (raw.status === "FINISHED") {
    if (raw.score.duration === "PENALTY_SHOOTOUT") {
      // Nuestro scoring se basa en el resultado al 120' (sin penales).
      // football-data deja extraTime con el resultado al final del alargue;
      // si por algún motivo no viene, fallback a fullTime (que en partidos
      // con penales suele coincidir igual con el 120').
      homeScore = raw.score.extraTime?.home ?? raw.score.fullTime.home;
      awayScore = raw.score.extraTime?.away ?? raw.score.fullTime.away;

      const pen = raw.score.penalties;
      if (pen && pen.home !== null && pen.away !== null) {
        penaltyWinner =
          pen.home > pen.away
            ? (raw.homeTeam.name ?? "TBD")
            : (raw.awayTeam.name ?? "TBD");
      }
    } else {
      homeScore = raw.score.fullTime.home;
      awayScore = raw.score.fullTime.away;
    }
  }

  return {
    externalId: raw.id,
    roundNumber: round.number,
    roundName: round.name,
    isKnockout: round.isKnockout,
    homeTeam: raw.homeTeam.name ?? "TBD",
    awayTeam: raw.awayTeam.name ?? "TBD",
    homeTeamCrest: raw.homeTeam.crest,
    awayTeamCrest: raw.awayTeam.crest,
    groupName: raw.group,
    kickoffAt: new Date(raw.utcDate),
    homeScore,
    awayScore,
    penaltyWinner,
    status: mapStatus(raw.status),
  };
}

export type SyncResult = {
  total: number;
  created: number;
  updated: number;
  reprogrammed: number;
};

export const LAST_SYNC_KEY = "last_sync";

export type LastSync = SyncResult & { at: string };

export async function syncFromApi(): Promise<SyncResult> {
  const apiMatches = await fetchAllMatches();
  const mapped = apiMatches.map(mapMatch);

  // 1 query para leer existentes y poder decidir reprogramación.
  const existing = await db.query.matches.findMany();
  const existingByExternalId = new Map(existing.map((m) => [m.externalId, m]));

  const now = Date.now();
  let created = 0;
  let updated = 0;
  let reprogrammed = 0;

  const rows = mapped.map((m) => {
    const prev = existingByExternalId.get(m.externalId);
    if (!prev) {
      created++;
      return { ...m, originalRoundNumber: null, updatedAt: new Date() };
    }

    updated++;
    const isReprogrammed =
      prev.roundNumber !== m.roundNumber && prev.kickoffAt.getTime() < now;
    if (isReprogrammed) reprogrammed++;

    return {
      ...m,
      originalRoundNumber: isReprogrammed
        ? (prev.originalRoundNumber ?? prev.roundNumber)
        : prev.originalRoundNumber,
      updatedAt: new Date(),
    };
  });

  // Bulk upsert: 1 sola query para los 104 partidos.
  if (rows.length > 0) {
    await db
      .insert(matches)
      .values(rows)
      .onConflictDoUpdate({
        target: matches.externalId,
        set: {
          roundNumber: sql`excluded.round_number`,
          roundName: sql`excluded.round_name`,
          isKnockout: sql`excluded.is_knockout`,
          homeTeam: sql`excluded.home_team`,
          awayTeam: sql`excluded.away_team`,
          homeTeamCrest: sql`excluded.home_team_crest`,
          awayTeamCrest: sql`excluded.away_team_crest`,
          groupName: sql`excluded.group_name`,
          kickoffAt: sql`excluded.kickoff_at`,
          homeScore: sql`excluded.home_score`,
          awayScore: sql`excluded.away_score`,
          penaltyWinner: sql`excluded.penalty_winner`,
          status: sql`excluded.status`,
          originalRoundNumber: sql`excluded.original_round_number`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // Con los matches ya actualizados, resolvemos/lockeamos/cancelamos las
  // apuestas que correspondan. Corre por cron y por el sync manual del admin.
  // No rompemos el sync si la resolución falla: logueamos y seguimos.
  try {
    await resolveFinishedBets();
  } catch (err) {
    console.error("[sync] resolveFinishedBets failed:", err);
  }

  const result: SyncResult = {
    total: apiMatches.length,
    created,
    updated,
    reprogrammed,
  };

  const lastSync: LastSync = { at: new Date().toISOString(), ...result };
  await db
    .insert(appState)
    .values({ key: LAST_SYNC_KEY, value: JSON.stringify(lastSync) })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });

  return result;
}
