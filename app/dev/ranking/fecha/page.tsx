import { RankingTable } from "@/app/ranking/ranking-table";
import { RoundSelect } from "@/app/ranking/fecha/round-select";
import { computeRoundRanking, getFinishedRounds } from "@/lib/ranking";
import { getScenario } from "@/lib/mock-ranking-data";

export default async function DevRankingFechaPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; round?: string }>;
}) {
  const { scenario, round: roundParam } = await searchParams;
  const data = getScenario(scenario);

  const finishedRounds = getFinishedRounds(data.matches);
  if (finishedRounds.length === 0) {
    return (
      <p className="text-text-gray py-8 text-center text-sm">
        Este escenario no tiene fechas jugadas.
      </p>
    );
  }

  const requested = roundParam ? Number(roundParam) : NaN;
  const selectedRound =
    finishedRounds.find((r) => r.number === requested) ??
    finishedRounds.at(-1)!;

  const matchesById = new Map(data.matches.map((m) => [m.id, m]));
  const rows = computeRoundRanking(
    data.users,
    data.predictions,
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
      <RankingTable rows={rows} currentUserId={data.currentUserId} />
    </section>
  );
}
