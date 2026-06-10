import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { computeEvolution, getFinishedRounds } from "@/lib/ranking";
import type { StatsMatch } from "@/lib/user-stats";
import { EvolutionChart } from "./chart";

export default async function RankingEvolucionPage() {
  await requireUser();

  const [allUsers, allPredictions, allMatches] = await Promise.all([
    db.query.users.findMany({ orderBy: [asc(users.createdAt)] }),
    db.query.predictions.findMany(),
    db.query.matches.findMany(),
  ]);

  const finishedRounds = getFinishedRounds(allMatches);
  const matchesAsStats: StatsMatch[] = allMatches;

  const series = computeEvolution(
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
    matchesAsStats,
    finishedRounds,
  );

  return (
    <section className="flex flex-col gap-4">
      <p className="text-text-gray text-sm">
        Puntos acumulados al cierre de cada fecha. No incluye ajustes.
      </p>
      <EvolutionChart series={series} />
    </section>
  );
}
