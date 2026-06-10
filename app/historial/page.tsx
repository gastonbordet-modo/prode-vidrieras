import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { RoundSelect } from "@/app/ranking/fecha/round-select";
import { HistoryMatchCard } from "@/components/history-match-card";
import { db } from "@/db/client";
import { matches, predictions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getFinishedRounds } from "@/lib/ranking";
import { score } from "@/lib/scoring";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { user } = await requireUser();
  const { round: roundParam } = await searchParams;

  const allMatches = await db.query.matches.findMany({
    orderBy: [asc(matches.kickoffAt)],
  });

  const finishedRounds = getFinishedRounds(allMatches);

  if (finishedRounds.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
        <Header />
        <p className="text-text-gray py-8 text-center text-sm">
          Todavía no terminó ninguna fecha. Vení después del primer partido
          finalizado.
        </p>
      </main>
    );
  }

  const requested = roundParam ? Number(roundParam) : NaN;
  const selectedRound =
    finishedRounds.find((r) => r.number === requested) ??
    finishedRounds.at(-1)!;

  const roundMatches = allMatches.filter(
    (m) => (m.originalRoundNumber ?? m.roundNumber) === selectedRound.number,
  );

  const userPredictions =
    roundMatches.length === 0
      ? []
      : await db.query.predictions.findMany({
          where: and(
            eq(predictions.userId, user.id),
            inArray(
              predictions.matchId,
              roundMatches.map((m) => m.id),
            ),
          ),
        });
  const predictionsByMatch = new Map(userPredictions.map((p) => [p.matchId, p]));

  let totalPoints = 0;
  for (const m of roundMatches) {
    const p = predictionsByMatch.get(m.id);
    if (!p) continue;
    if (m.status !== "finished") continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    totalPoints += score(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinner: p.penaltyWinner,
      },
      {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        penaltyWinner: m.penaltyWinner,
        isKnockout: m.isKnockout,
      },
    ).points;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <Header />

      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-text-gray text-xs tracking-wider uppercase">
            {selectedRound.name}
          </p>
          <p className="text-text-dark text-lg font-semibold">
            Total: <span className="text-default">{totalPoints} pts</span>
          </p>
        </div>
        <RoundSelect rounds={finishedRounds} selected={selectedRound.number} />
      </section>

      <section className="flex flex-col gap-3">
        {roundMatches.map((m) => (
          <HistoryMatchCard
            key={m.id}
            match={m}
            prediction={predictionsByMatch.get(m.id) ?? null}
          />
        ))}
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-default text-xl font-bold">Historial</h1>
      <Link
        href="/"
        className="text-text-gray hover:text-text-light text-sm underline-offset-4 hover:underline"
      >
        Volver
      </Link>
    </header>
  );
}
