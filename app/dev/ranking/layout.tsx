import Link from "next/link";
import { notFound } from "next/navigation";
import { TabsNav } from "@/app/ranking/tabs-nav";
import { SCENARIOS } from "@/lib/mock-ranking-data";
import { ScenarioSelector } from "./scenario-selector";

export default function DevRankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const summary = SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-system-warning-dark text-xs font-bold tracking-wider uppercase">
            Dev preview
          </p>
          <h1 className="text-default text-xl font-bold">Ranking · mocks</h1>
        </div>
        <Link
          href="/"
          className="text-text-gray hover:text-text-light text-sm underline-offset-4 hover:underline"
        >
          Volver
        </Link>
      </header>
      <ScenarioSelector scenarios={summary} />
      <TabsNav basePath="/dev/ranking" />
      {children}
    </main>
  );
}
