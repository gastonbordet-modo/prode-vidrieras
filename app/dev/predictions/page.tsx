import { MatchCard } from "@/components/match-card";
import { devSubmitPrediction } from "./dev-action";
import { getPredictionScenario } from "./mock-matches";

export default async function DevPredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const data = getPredictionScenario(scenario);

  // Server Component: Date.now() es determinístico por request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <section className="flex flex-col gap-3">
      <MatchCard
        match={data.match}
        prediction={data.prediction}
        now={now}
        action={devSubmitPrediction}
      />
    </section>
  );
}
