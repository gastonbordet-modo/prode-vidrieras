import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { matches, predictions, scoreAdjustments, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  computeUserStats,
  type StatsMatch,
  type StatsPrediction,
} from "@/lib/user-stats";
import { DeleteUserButton } from "./delete-user-button";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function AdminUsersPage() {
  const { user: admin } = await requireAdmin();

  const [allUsers, allPredictions, finishedMatches, allAdjustments] =
    await Promise.all([
      db.query.users.findMany({ orderBy: [asc(users.createdAt)] }),
      db.query.predictions.findMany(),
      db.query.matches.findMany({ where: eq(matches.status, "finished") }),
      db.query.scoreAdjustments.findMany(),
    ]);

  const matchesById = new Map<number, StatsMatch>(
    finishedMatches.map((m) => [m.id, m]),
  );
  const predictionRows: StatsPrediction[] = allPredictions.map((p) => ({
    userId: p.userId,
    matchId: p.matchId,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    penaltyWinner: p.penaltyWinner,
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="space-y-1">
        <p className="text-text-gray text-xs tracking-wider uppercase">
          Admin
        </p>
        <h2 className="text-text-dark text-2xl font-bold">Usuarios</h2>
        <p className="text-text-gray text-sm">
          {allUsers.length} registrados
        </p>
      </header>

      <div className="bg-background-container border-opacity-white-12 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-text-gray border-opacity-white-12 border-b text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">Nickname</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Alta</th>
              <th className="px-3 py-2 text-right">Pred.</th>
              <th className="px-3 py-2 text-right">Puntos</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-text-light">
            {allUsers.map((u) => {
              const stats = computeUserStats(
                u.id,
                predictionRows,
                matchesById,
                allAdjustments,
              );
              const isSelf = u.id === admin.id;
              return (
                <tr
                  key={u.id}
                  className="border-opacity-white-12 border-b last:border-b-0"
                >
                  <td className="text-text-dark px-3 py-2 font-semibold">
                    {u.nickname}
                    {isSelf && (
                      <span className="text-text-gray ml-1 text-xs">
                        (vos)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    {u.role === "admin" ? (
                      <span className="text-default font-semibold">admin</span>
                    ) : (
                      <span className="text-text-gray">user</span>
                    )}
                  </td>
                  <td className="text-text-gray px-3 py-2">
                    {dateFmt.format(u.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {stats.predictionsCount}
                  </td>
                  <td className="text-text-dark px-3 py-2 text-right font-semibold">
                    {stats.points}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/users/${u.id}/adjust`}
                        className="text-system-links hover:underline"
                      >
                        Ajustar
                      </Link>
                      <DeleteUserButton
                        userId={u.id}
                        userNickname={u.nickname}
                        disabled={isSelf}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
