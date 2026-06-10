import Link from "next/link";
import { notFound } from "next/navigation";
import { SCENARIOS } from "./mock-matches";
import { ScenarioSelector } from "./scenario-selector";

export default function DevPredictionsLayout({
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-system-warning-dark text-xs font-bold tracking-wider uppercase">
            Dev preview
          </p>
          <h1 className="text-default text-xl font-bold">Predicciones · mocks</h1>
        </div>
        <Link
          href="/"
          className="text-text-gray hover:text-text-light text-sm underline-offset-4 hover:underline"
        >
          Volver
        </Link>
      </header>
      <ScenarioSelector scenarios={summary} />
      {children}
    </main>
  );
}
