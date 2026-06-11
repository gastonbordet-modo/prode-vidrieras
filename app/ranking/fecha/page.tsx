import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { computeRoundRanking, getFinishedRounds } from "@/lib/ranking";
import { loadTagsByUser } from "@/lib/load-tags";
import type { StatsMatch } from "@/lib/user-stats";
import { RankingTable } from "../ranking-table";
import { RoundSelect } from "./round-select";

export default async function RankingFechaPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { user } = await requireUser();
  const { round: roundParam } = await searchParams;

  const [allUsers, allPredictions, allMatches, tagsByUser] = await Promise.all([
    db.query.users.findMany({ orderBy: [asc(users.createdAt)] }),
    db.query.predictions.findMany(),
    db.query.matches.findMany(),
    loadTagsByUser(),
  ]);

  const finishedRounds = getFinishedRounds(allMatches);
  if (finishedRounds.length === 0) {
    return (
      <p className="text-text-gray py-8 text-center text-sm">
        Todavía no se jugó ninguna fecha.
      </p>
    );
  }

  const requested = roundParam ? Number(roundParam) : NaN;
  const selectedRound =
    finishedRounds.find((r) => r.number === requested) ??
    finishedRounds.at(-1)!;

  const matchesById = new Map<number, StatsMatch>(
    allMatches.map((m) => [m.id, m]),
  );
  const rows = computeRoundRanking(
    allUsers.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      createdAt: u.createdAt,
    })),
    allPredictions.map((p) => ({
      userId: p.userId,
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      penaltyWinner: p.penaltyWinner,
    })),
    matchesById,
    selectedRound.number,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-text-gray text-sm">
          Puntos hechos en esta fecha (sin ajustes).
        </p>
        <RoundSelect rounds={finishedRounds} selected={selectedRound.number} />
      </div>
      <RankingTable rows={rows} currentUserId={user.id} tagsByUser={tagsByUser} />
    </section>
  );
}
