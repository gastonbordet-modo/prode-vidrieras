import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  betEntries,
  bets,
  matches,
  predictions,
  scoreAdjustments,
  users,
} from "@/db/schema";
import { getActiveRound } from "@/lib/active-round";
import { requireUser } from "@/lib/auth";
import { availableBalance } from "@/lib/bet-balance";
import { outcomeFromScore, type BetOutcome } from "@/lib/bet-side";
import { buildBetView, type BetView, type BetViewEntry } from "@/lib/bet-view";
import { getOpenBetsForUser } from "@/lib/bets";
import { computeGeneralRanking } from "@/lib/ranking";
import { getLockReason } from "@/lib/match-editable";
import type { StatsMatch } from "@/lib/user-stats";
import { MainTabs } from "@/components/main-tabs";
import { BetsList } from "@/components/bets/bets-list";
import {
  CreateBetForm,
  type CreatableMatch,
} from "@/components/bets/create-bet-form";

export const metadata = { title: "Casino" };

export default async function CasinoPage() {
  const { user } = await requireUser();
  // Server Component: una sola evaluación por request, determinístico para
  // el HTML servido.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const [
    activeRound,
    allUsers,
    allBets,
    allEntries,
    allMatches,
    allPredictions,
    allAdjustments,
    openBets,
  ] = await Promise.all([
    getActiveRound(),
    db.query.users.findMany(),
    db.query.bets.findMany(),
    db.query.betEntries.findMany({ orderBy: [asc(betEntries.createdAt)] }),
    db.query.matches.findMany(),
    db.query.predictions.findMany(),
    db.query.scoreAdjustments.findMany(),
    getOpenBetsForUser(user.id),
  ]);

  const nicknameById = new Map(allUsers.map((u) => [u.id, u.nickname]));
  const matchById = new Map(allMatches.map((m) => [m.id, m]));

  // Balance: puntos del ranking general (ya incluyen ajustes de apuestas
  // resueltas) menos lo comprometido en apuestas abiertas/lockeadas.
  const ranking = computeGeneralRanking(
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
    matchById as Map<number, StatsMatch>,
    allAdjustments.map((a) => ({ userId: a.userId, points: a.points })),
  );
  const rankingPoints = ranking.find((r) => r.userId === user.id)?.points ?? 0;
  const committed = openBets.reduce((s, b) => s + b.amount, 0);
  const available = availableBalance(
    rankingPoints,
    openBets.map((b) => ({ amount: b.amount })),
  );

  // Entries agrupadas por apuesta (ya vienen ordenadas por antigüedad).
  const entriesByBet = new Map<number, BetViewEntry[]>();
  for (const e of allEntries) {
    const list = entriesByBet.get(e.betId) ?? [];
    list.push({
      userId: e.userId,
      nickname: nicknameById.get(e.userId) ?? "—",
      side: e.side,
    });
    entriesByBet.set(e.betId, list);
  }

  const views: BetView[] = [];
  for (const b of allBets) {
    const match = matchById.get(b.matchId);
    if (!match) continue;
    views.push(
      buildBetView(
        {
          id: b.id,
          creatorId: b.creatorId,
          pick: b.pick,
          amount: b.amount,
          status: b.status,
          outcome: b.outcome,
          match: {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeTeamCrest: match.homeTeamCrest,
            awayTeamCrest: match.awayTeamCrest,
            kickoffAt: match.kickoffAt,
            status: match.status,
            roundNumber: match.roundNumber,
          },
          entries: entriesByBet.get(b.id) ?? [],
        },
        user.id,
        now,
      ),
    );
  }

  // Orden: abiertas/lockeadas primero, luego por kickoff.
  const statusRank: Record<BetView["status"], number> = {
    open: 0,
    locked: 1,
    resolved: 2,
    cancelled: 3,
  };
  const sortBets = (a: BetView, b: BetView) =>
    statusRank[a.status] - statusRank[b.status] ||
    a.kickoffIso.localeCompare(b.kickoffIso);

  const deLaFecha = views
    .filter((v) => v.roundNumber === activeRound)
    .sort(sortBets);
  const mias = views.filter((v) => v.isMine).sort(sortBets);
  const historico = views
    .filter(
      (v) =>
        (v.status === "resolved" || v.status === "cancelled") &&
        v.roundNumber !== activeRound,
    )
    .sort(sortBets);

  // Partidos en los que se puede crear una apuesta: fecha activa, antes del
  // kickoff. Adjuntamos el 1X2 del pronóstico del usuario (el pick debe
  // coincidir) o null si todavía no pronosticó.
  const userPredByMatch = new Map(
    allPredictions
      .filter((p) => p.userId === user.id)
      .map((p) => [p.matchId, p]),
  );
  const creatableMatches: CreatableMatch[] = allMatches
    .filter(
      (m) =>
        m.roundNumber === activeRound && getLockReason(m, now) === null,
    )
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())
    .map((m) => {
      const pred = userPredByMatch.get(m.id);
      const predictionOutcome: BetOutcome | null = pred
        ? outcomeFromScore(pred.homeScore, pred.awayScore)
        : null;
      return {
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoffIso: m.kickoffAt.toISOString(),
        predictionOutcome,
      };
    });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <MainTabs />
      <h1 className="text-default text-xl font-bold">Casino</h1>

      <section className="bg-background-container border-opacity-white-12 grid grid-cols-3 gap-2 rounded-md border px-4 py-3 text-center">
        <Stat label="Tu puntaje" value={rankingPoints} />
        <Stat label="Comprometido" value={committed} />
        <Stat
          label="Disponible"
          value={available}
          highlight={available < 0}
        />
      </section>

      <CreateBetForm matches={creatableMatches} />

      <BetsList deLaFecha={deLaFecha} mias={mias} historico={historico} />
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-text-gray text-xs tracking-wider uppercase">
        {label}
      </span>
      <span
        className={
          "text-lg font-bold tabular-nums " +
          (highlight ? "text-system-error-dark" : "text-text-dark")
        }
      >
        {value}
      </span>
    </div>
  );
}
