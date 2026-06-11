import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { computeGeneralRanking } from "@/lib/ranking";
import { loadTagsByUser } from "@/lib/load-tags";
import type { StatsMatch } from "@/lib/user-stats";
import { RankingTable } from "./ranking-table";

export default async function RankingGeneralPage() {
  const { user } = await requireUser();

  const [allUsers, allPredictions, allMatches, allAdjustments, tagsByUser] =
    await Promise.all([
      db.query.users.findMany({ orderBy: [asc(users.createdAt)] }),
      db.query.predictions.findMany(),
      db.query.matches.findMany(),
      db.query.scoreAdjustments.findMany(),
      loadTagsByUser(),
    ]);

  const matchesById = new Map<number, StatsMatch>(
    allMatches.map((m) => [m.id, m]),
  );
  const rows = computeGeneralRanking(
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
    allAdjustments.map((a) => ({ userId: a.userId, points: a.points })),
  );

  return (
    <section className="flex flex-col gap-3">
      <p className="text-text-gray text-sm">
        Ranking del torneo. Los ajustes manuales se incluyen en el total.
        Desempate: puntos → exactos → antigüedad de registro.
      </p>
      <RankingTable
        rows={rows}
        currentUserId={user.id}
        tagsByUser={tagsByUser}
        emptyMessage="Todavía no hay usuarios registrados."
      />
    </section>
  );
}
