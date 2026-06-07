"use client";

import { useActionState } from "react";
import { submitPrediction, type SubmitPredictionState } from "@/app/actions";

const initialState: SubmitPredictionState = null;

export function PredictionForm({
  matchId,
  existingHome,
  existingAway,
}: {
  matchId: number;
  existingHome: number | null;
  existingAway: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitPrediction,
    initialState,
  );
  const hasExisting = existingHome !== null && existingAway !== null;

  return (
    <form
      action={formAction}
      className="border-opacity-white-12 -mx-4 flex flex-col gap-2 border-t px-4 pt-3"
    >
      <input type="hidden" name="matchId" value={matchId} />

      <div className="flex items-center justify-between gap-3">
        <div className="text-text-dark flex items-center gap-2">
          <input
            name="homeScore"
            type="number"
            min={0}
            max={20}
            defaultValue={existingHome ?? ""}
            required
            inputMode="numeric"
            aria-label="Goles equipo local"
            className="bg-opacity-white-12 focus:bg-opacity-white-30 w-14 rounded-md px-2 py-1.5 text-center text-base font-semibold tabular-nums transition-colors outline-none"
          />
          <span className="text-text-gray">-</span>
          <input
            name="awayScore"
            type="number"
            min={0}
            max={20}
            defaultValue={existingAway ?? ""}
            required
            inputMode="numeric"
            aria-label="Goles equipo visitante"
            className="bg-opacity-white-12 focus:bg-opacity-white-30 w-14 rounded-md px-2 py-1.5 text-center text-base font-semibold tabular-nums transition-colors outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-button bg-default text-text-button px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
        >
          {pending ? "..." : hasExisting ? "Actualizar" : "Guardar"}
        </button>
      </div>

      {state?.error && (
        <p role="alert" className="text-system-error-dark text-xs">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p
          role="status"
          className="text-system-success-dark text-xs font-semibold"
        >
          Guardado
        </p>
      )}
    </form>
  );
}
