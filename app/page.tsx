import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { chatMessages, matches, predictions, users } from "@/db/schema";
import { getActiveRound } from "@/lib/active-round";
import { requireUser } from "@/lib/auth";
import { loadTagsByUser, tagsToRecord } from "@/lib/load-tags";
import { ChatSection, type ChatMessageRow } from "@/components/chat-section";
import { MainTabs } from "@/components/main-tabs";
import { MatchCard } from "@/components/match-card";
import { TagChips } from "@/components/tag-chip";
import { signOut } from "./actions";

export default async function HomePage() {
  const { user } = await requireUser();
  const activeRound = await getActiveRound();
  const tagsByUser = await loadTagsByUser();

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

  const chatRows = await db
    .select({
      id: chatMessages.id,
      userId: chatMessages.userId,
      nickname: users.nickname,
      text: chatMessages.text,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .orderBy(asc(chatMessages.createdAt));
  const initialChatMessages: ChatMessageRow[] = chatRows.map((r) => ({
    id: r.id,
    userId: r.userId,
    nickname: r.nickname,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-text-gray flex flex-wrap items-center gap-1.5 text-sm">
          Hola,{" "}
          <strong className="text-text-dark font-semibold">
            {user.nickname}
          </strong>
          <TagChips tags={tagsByUser.get(user.id) ?? []} />
        </span>
        <div className="flex items-center gap-4">
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

      <ChatSection
        initialMessages={initialChatMessages}
        currentUserId={user.id}
        tagsByUser={tagsToRecord(tagsByUser)}
      />

      <MainTabs />

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
