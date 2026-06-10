import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { matches, predictions } from "@/db/schema";
import { getActiveRound } from "@/lib/active-round";
import { requireUser } from "@/lib/auth";
import { MatchCard } from "@/components/match-card";
import { signOut } from "./actions";

export default async function HomePage() {
  const { user } = await requireUser();
  const activeRound = await getActiveRound();

  const roundMatches =
    activeRound === null
      ? []
      : await db.query.matches.findMany({
          where: eq(matches.roundNumber, activeRound),
          orderBy: [asc(matches.kickoffAt)],
        });

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
  const predictionsByMatchId = new Map(
    userPredictions.map((p) => [p.matchId, p]),
  );

  const roundName = roundMatches[0]?.roundName;
  // Server Component: se ejecuta una vez por request, Date.now() acá es
  // determinístico desde el punto de vista del HTML servido.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-text-gray text-sm">
          Hola,{" "}
          <strong className="text-text-dark font-semibold">
            {user.nickname}
          </strong>
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/ranking"
            className="text-system-links text-sm underline-offset-4 hover:underline"
          >
            Ranking
          </Link>
          <Link
            href="/historial"
            className="text-system-links text-sm underline-offset-4 hover:underline"
          >
            Historial
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="text-system-links text-sm underline-offset-4 hover:underline"
            >
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="text-system-links text-sm underline-offset-4 hover:underline"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      {activeRound === null ? (
        <EmptyState
          title="El torneo todavía no está cargado"
          description="Cuando se sincronicen los fixtures del Mundial 2026 vas a ver los partidos acá."
        />
      ) : (
        <>
          <section className="space-y-1">
            <p className="text-text-gray text-xs tracking-wider uppercase">
              Fecha actual
            </p>
            <h1 className="text-default text-2xl font-bold">{roundName}</h1>
          </section>

          <section className="flex flex-col gap-3">
            {roundMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionsByMatchId.get(match.id) ?? null}
                now={now}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bg-background-container border-opacity-white-12 mt-8 space-y-2 rounded-md border px-6 py-8 text-center">
      <h2 className="text-text-dark text-lg font-semibold">{title}</h2>
      <p className="text-text-gray text-sm">{description}</p>
    </section>
  );
}
