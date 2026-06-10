"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  submitPrediction,
  type SubmitPredictionState,
} from "@/app/actions";
import { isPenaltyApplicable } from "@/lib/match-editable";
import type { PenaltySide } from "@/lib/penalty-winner";
import { NumberStepper } from "./number-stepper";

type TeamInfo = { name: string; crest: string | null };

export type PredictionAction = (
  prev: SubmitPredictionState,
  formData: FormData,
) => Promise<SubmitPredictionState>;

const DEBOUNCE_MS = 1000;

type SavedState = {
  home: number;
  away: number;
  penaltyWinner: PenaltySide | null;
};

export function PredictionForm({
  matchId,
  home,
  away,
  isKnockout,
  existing,
  action = submitPrediction,
}: {
  matchId: number;
  home: TeamInfo;
  away: TeamInfo;
  isKnockout: boolean;
  existing: {
    home: number | null;
    away: number | null;
    penaltyWinner: PenaltySide | null;
  };
  /**
   * Server Action que recibe el FormData. Default: el real
   * `submitPrediction`. La sobrescribe `/dev/predictions` con un stub
   * que no toca DB para previsualizar el form sin esperar al torneo.
   */
  action?: PredictionAction;
}) {
  const [homeScore, setHomeScore] = useState<number | null>(existing.home);
  const [awayScore, setAwayScore] = useState<number | null>(existing.away);
  const [penaltyWinner, setPenaltyWinner] = useState<PenaltySide | null>(
    existing.penaltyWinner,
  );
  const [lastSaved, setLastSaved] = useState<SavedState | null>(
    existing.home !== null && existing.away !== null
      ? {
          home: existing.home,
          away: existing.away,
          penaltyWinner: existing.penaltyWinner,
        }
      : null,
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const showPenaltyPicker = isPenaltyApplicable(
    isKnockout,
    homeScore,
    awayScore,
  );

  // Auto-save: cuando los scores están seteados y algún campo difiere del
  // último guardado, dispara la acción después del debounce.
  useEffect(() => {
    if (homeScore === null || awayScore === null) return;

    // Si el partido no aplica penales o no hay empate, ignoramos el
    // penaltyWinner local para la comparación: lo manda como null.
    const effectivePenalty = isPenaltyApplicable(
      isKnockout,
      homeScore,
      awayScore,
    )
      ? penaltyWinner
      : null;

    if (
      lastSaved &&
      homeScore === lastSaved.home &&
      awayScore === lastSaved.away &&
      effectivePenalty === lastSaved.penaltyWinner
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("homeScore", String(homeScore));
      fd.set("awayScore", String(awayScore));
      fd.set("penaltyWinner", effectivePenalty ?? "");

      startTransition(async () => {
        const result = await action(null, fd);
        if (result?.error) {
          setError(result.error);
        } else if (result?.ok) {
          setError(null);
          setLastSaved({
            home: homeScore,
            away: awayScore,
            penaltyWinner: effectivePenalty,
          });
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    homeScore,
    awayScore,
    penaltyWinner,
    matchId,
    lastSaved,
    isKnockout,
    action,
  ]);

  const isSaved =
    lastSaved !== null &&
    homeScore === lastSaved.home &&
    awayScore === lastSaved.away &&
    (showPenaltyPicker ? penaltyWinner : null) === lastSaved.penaltyWinner;

  return (
    <>
      <TeamLine
        team={home}
        stepper={
          <NumberStepper
            value={homeScore}
            onChange={(next) => {
              setHomeScore(next);
              if (next !== null && awayScore === null) setAwayScore(0);
            }}
            ariaLabel={`Goles de ${home.name}`}
          />
        }
      />
      <TeamLine
        team={away}
        stepper={
          <NumberStepper
            value={awayScore}
            onChange={(next) => {
              setAwayScore(next);
              if (next !== null && homeScore === null) setHomeScore(0);
            }}
            ariaLabel={`Goles de ${away.name}`}
          />
        }
      />

      {showPenaltyPicker && (
        <div className="border-opacity-white-12 -mx-4 flex flex-col gap-2 border-t px-4 pt-3">
          <span className="text-text-gray text-xs">¿Quién gana por penales?</span>
          <div className="grid grid-cols-2 gap-2">
            <PenaltyOption
              label={home.name === "TBD" ? "Local" : home.name}
              selected={penaltyWinner === "home"}
              onClick={() => setPenaltyWinner("home")}
            />
            <PenaltyOption
              label={away.name === "TBD" ? "Visitante" : away.name}
              selected={penaltyWinner === "away"}
              onClick={() => setPenaltyWinner("away")}
            />
          </div>
          {penaltyWinner === null && (
            <p className="text-system-warning-dark text-xs">
              Si no elegís, no podés ganar el bonus de +5 por penales.
            </p>
          )}
        </div>
      )}

      <div className="flex min-h-[1.25rem] items-center justify-end">
        {error ? (
          <p role="alert" className="text-system-error-dark text-xs">
            {error}
          </p>
        ) : isSaved ? (
          <p
            role="status"
            className="text-system-success-dark inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Guardado
          </p>
        ) : null}
      </div>
    </>
  );
}

function PenaltyOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "rounded-md border px-3 py-2 text-sm font-semibold transition-colors " +
        (selected
          ? "bg-default text-text-button border-default"
          : "border-opacity-white-12 text-text-light hover:border-default")
      }
    >
      {label}
    </button>
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
