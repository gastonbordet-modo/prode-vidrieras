"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type FormEvent } from "react";
import { createBet, type BetActionState } from "@/app/casino/actions";
import type { BetOutcome } from "@/lib/bet-side";

export type CreatableMatch = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoffIso: string;
  predictionOutcome: BetOutcome | null;
};

const kickoffFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function CreateBetForm({ matches }: { matches: CreatableMatch[] }) {
  const [matchId, setMatchId] = useState<number | null>(matches[0]?.id ?? null);
  const selected = useMemo(
    () => matches.find((m) => m.id === matchId) ?? null,
    [matches, matchId],
  );

  const [amount, setAmount] = useState(1);

  // El pick no se elige: está determinado por el pronóstico del usuario
  // (es el único válido server-side). Lo derivamos del partido seleccionado.
  const pick = selected?.predictionOutcome ?? "";

  const [state, action, pending] = useActionState<BetActionState, FormData>(
    async (prev, formData) => {
      const result = await createBet(prev, formData);
      if (result?.ok) setAmount(1);
      return result;
    },
    null,
  );

  if (matches.length === 0) {
    return (
      <section className="bg-background-container border-opacity-white-12 rounded-md border px-4 py-4 text-sm">
        <h2 className="text-text-dark font-semibold">Crear apuesta</h2>
        <p className="text-text-gray mt-1">
          No hay partidos abiertos para apostar en esta fecha.
        </p>
      </section>
    );
  }

  const noPrediction = selected !== null && selected.predictionOutcome === null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (noPrediction || pick === "") e.preventDefault();
  }

  return (
    <section className="bg-background-container border-opacity-white-12 flex flex-col gap-3 rounded-md border px-4 py-4">
      <h2 className="text-text-dark font-semibold">Crear apuesta</h2>

      <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="matchId" value={matchId ?? ""} />

        <label className="flex flex-col gap-1">
          <span className="text-text-gray text-xs tracking-wider uppercase">
            Partido
          </span>
          <select
            value={matchId ?? ""}
            onChange={(e) => setMatchId(Number(e.target.value))}
            className="bg-background-home-section border-opacity-white-12 text-text-light focus:border-default rounded-md border px-3 py-2 text-sm outline-none"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam} vs {m.awayTeam} ·{" "}
                {kickoffFormatter.format(new Date(m.kickoffIso))}
              </option>
            ))}
          </select>
        </label>

        {noPrediction ? (
          <p className="text-text-gray text-sm">
            Cargá tu pronóstico para este partido primero.{" "}
            <Link
              href="/"
              className="text-system-links underline-offset-4 hover:underline"
            >
              Ir a pronosticar
            </Link>
          </p>
        ) : (
          <fieldset className="flex flex-col gap-1">
            <span className="text-text-gray text-xs tracking-wider uppercase">
              Tu pick (según tu pronóstico)
            </span>
            <div className="flex flex-col gap-1.5">
              {selected &&
                (
                  [
                    ["home", `Gana ${selected.homeTeam}`],
                    ["draw", "Empate"],
                    ["away", `Gana ${selected.awayTeam}`],
                  ] as [BetOutcome, string][]
                ).map(([value, label]) => {
                  const allowed = selected.predictionOutcome === value;
                  return (
                    <label
                      key={value}
                      className={
                        "flex items-center gap-2 text-sm " +
                        (allowed
                          ? "text-text-light"
                          : "text-text-gray opacity-50")
                      }
                    >
                      <input
                        type="radio"
                        name="pick"
                        value={value}
                        checked={pick === value}
                        disabled={!allowed}
                        readOnly
                        className="accent-default"
                      />
                      {label}
                    </label>
                  );
                })}
            </div>
            <p className="text-text-gray text-xs">
              El pick tiene que coincidir con tu pronóstico cargado.
            </p>
          </fieldset>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-text-gray text-xs tracking-wider uppercase">
            Monto (1 a 20 pts)
          </span>
          <input
            type="number"
            name="amount"
            min={1}
            max={20}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-background-home-section border-opacity-white-12 text-text-light focus:border-default w-24 rounded-md border px-3 py-2 text-sm outline-none"
          />
        </label>

        {state?.error && (
          <p className="text-system-error-dark text-sm">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending || noPrediction || pick === ""}
          className="bg-default text-text-light self-start rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {pending ? "Creando…" : "Crear apuesta"}
        </button>
      </form>
    </section>
  );
}
