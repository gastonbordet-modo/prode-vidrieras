"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { submitPrediction } from "@/app/actions";
import { NumberStepper } from "./number-stepper";

type TeamInfo = { name: string; crest: string | null };

const DEBOUNCE_MS = 1000;

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
  const [homeScore, setHomeScore] = useState<number | null>(existing.home);
  const [awayScore, setAwayScore] = useState<number | null>(existing.away);
  const [lastSaved, setLastSaved] = useState<{
    home: number;
    away: number;
  } | null>(
    existing.home !== null && existing.away !== null
      ? { home: existing.home, away: existing.away }
      : null,
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto-save: cuando ambos scores están seteados y son distintos al último
  // guardado, dispara la acción de servidor después de DEBOUNCE_MS de
  // inactividad. El cleanup cancela timers pendientes si el user sigue
  // tocando.
  useEffect(() => {
    if (homeScore === null || awayScore === null) return;
    if (
      lastSaved &&
      homeScore === lastSaved.home &&
      awayScore === lastSaved.away
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("homeScore", String(homeScore));
      fd.set("awayScore", String(awayScore));

      startTransition(async () => {
        const result = await submitPrediction(null, fd);
        if (result?.error) {
          setError(result.error);
        } else if (result?.ok) {
          setError(null);
          setLastSaved({ home: homeScore, away: awayScore });
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [homeScore, awayScore, matchId, lastSaved]);

  const isSaved =
    lastSaved !== null &&
    homeScore === lastSaved.home &&
    awayScore === lastSaved.away;

  return (
    <>
      <TeamLine
        team={home}
        stepper={
          <NumberStepper
            value={homeScore}
            onChange={(next) => {
              setHomeScore(next);
              // Si es el primer score que se carga, llenamos el otro con 0
              // para que el debounce pueda dispararse sin obligar al user
              // a tocar los dos lados.
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
