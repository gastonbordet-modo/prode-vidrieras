import { EvolutionChart } from "@/app/ranking/evolucion/chart";
import { computeEvolution, getFinishedRounds } from "@/lib/ranking";
import { getScenario } from "@/lib/mock-ranking-data";

export default async function DevRankingEvolucionPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const data = getScenario(scenario);
  const finishedRounds = getFinishedRounds(data.matches);
  const series = computeEvolution(
    data.users,
    data.predictions,
    data.matches,
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
