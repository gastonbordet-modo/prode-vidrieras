import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
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

  const roundName = roundMatches[0]?.roundName;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-text-gray text-sm">
          Hola,{" "}
          <strong className="text-text-dark font-semibold">
            {user.nickname}
          </strong>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-system-links text-sm underline-offset-4 hover:underline"
          >
            Salir
          </button>
        </form>
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
              <MatchCard key={match.id} match={match} />
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
