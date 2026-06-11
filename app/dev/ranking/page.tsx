import { RankingTable } from "@/app/ranking/ranking-table";
import { computeGeneralRanking } from "@/lib/ranking";
import { getScenario } from "@/lib/mock-ranking-data";

export default async function DevRankingGeneralPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const data = getScenario(scenario);
  const matchesById = new Map(data.matches.map((m) => [m.id, m]));
  const rows = computeGeneralRanking(
    data.users,
    data.predictions,
    matchesById,
    data.adjustments,
  );

  return (
    <section className="flex flex-col gap-3">
      <p className="text-text-gray text-sm">
        Ranking general (incluye ajustes). Desempate: puntos → exactos → antigüedad.
      </p>
      <RankingTable rows={rows} currentUserId={data.currentUserId} />
    </section>
  );
}
