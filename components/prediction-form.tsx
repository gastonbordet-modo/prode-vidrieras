"use client";

import { Check, Pencil, Save } from "lucide-react";
import { useActionState } from "react";
import { submitPrediction, type SubmitPredictionState } from "@/app/actions";
import { NumberStepper } from "./number-stepper";

const initialState: SubmitPredictionState = null;

type TeamInfo = { name: string; crest: string | null };

export function PredictionForm({
  matchId,
  home,
  away,
  existing,
}: {
  matchId: number;
  home: TeamInfo;
  away: TeamInfo;
  existing: { home: number | null; away: number | null };
}) {
  const [state, formAction, pending] = useActionState(
    submitPrediction,
    initialState,
  );
  const hasExisting = existing.home !== null && existing.away !== null;
  const ActionIcon = hasExisting ? Pencil : Save;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="matchId" value={matchId} />

      <TeamLine
        team={home}
        stepper={
          <NumberStepper
            name="homeScore"
            defaultValue={existing.home}
            ariaLabel={`Goles de ${home.name}`}
          />
        }
      />
      <TeamLine
        team={away}
        stepper={
          <NumberStepper
            name="awayScore"
            defaultValue={existing.away}
            ariaLabel={`Goles de ${away.name}`}
          />
        }
      />

      <div className="flex items-center justify-between gap-3">
        {state?.error ? (
          <p role="alert" className="text-system-error-dark text-xs">
            {state.error}
          </p>
        ) : state?.ok ? (
          <p
            role="status"
            className="text-system-success-dark inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Guardado
          </p>
        ) : (
          <span />
        )}

        <button
          type="submit"
          disabled={pending}
          aria-label={
            hasExisting ? "Actualizar pronóstico" : "Guardar pronóstico"
          }
          className="bg-default text-text-button grid h-9 w-9 shrink-0 place-items-center rounded-md transition-opacity disabled:opacity-60"
        >
          <ActionIcon className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
}

function TeamLine({
  team,
  stepper,
}: {
  team: TeamInfo;
  stepper: React.ReactNode;
}) {
  const isTbd = team.name === "TBD";
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {team.crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.crest}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="bg-opacity-white-12 h-7 w-7 shrink-0 rounded-sm" />
        )}
        {isTbd ? (
          <span className="text-text-gray truncate italic">Por definir</span>
        ) : (
          <span className="text-text-dark truncate font-semibold">
            {team.name}
          </span>
        )}
      </div>
      <div className="shrink-0">{stepper}</div>
    </div>
  );
}
