"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { MockPredictionScenario } from "./mock-matches";

export function ScenarioSelector({
  scenarios,
}: {
  scenarios: Pick<MockPredictionScenario, "id" | "label" | "description">[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const requested = searchParams.get("scenario");
  const selected =
    scenarios.find((s) => s.id === requested)?.id ?? scenarios[0]!.id;
  const selectedScenario = scenarios.find((s) => s.id === selected);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2">
        <span className="text-text-gray text-sm">Escenario</span>
        <select
          value={selected}
          disabled={pending}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams);
            params.set("scenario", e.target.value);
            startTransition(() => {
              router.replace(`${pathname}?${params.toString()}`);
            });
          }}
          className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-50"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {selectedScenario && (
        <p className="text-text-gray text-xs">{selectedScenario.description}</p>
      )}
    </div>
  );
}
