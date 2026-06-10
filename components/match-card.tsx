import type { CSSProperties } from "react";
import type { matches, predictions } from "@/db/schema";
import { getGroupColor } from "@/lib/group-colors";
import { isMatchEditable } from "@/lib/match-editable";
import { deriveSideFromTeam } from "@/lib/penalty-winner";
import { PredictionForm } from "./prediction-form";
import { TeamDisplay } from "./team-display";

type Match = typeof matches.$inferSelect;
type Prediction = typeof predictions.$inferSelect;

const STATUS_LABEL: Record<Match["status"], string> = {
  scheduled: "Programado",
  live: "En vivo",
  finished: "Finalizado",
  postponed: "Reprogramado",
};

const STATUS_CLASS: Record<Match["status"], string> = {
  scheduled: "text-text-gray",
  live: "text-default",
  finished: "text-system-success-dark",
  postponed: "text-system-warning-dark",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatKickoff(date: Date): string {
  return dateFormatter.format(date).replace(",", " ·");
}

function formatGroup(group: string | null): string | null {
  if (!group) return null;
  return `Grupo ${group.replace("GROUP_", "")}`;
}

function tintedStyle(color: string | null): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    backgroundColor: `color-mix(in oklab, ${color} 12%, #453359)`,
    borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
    boxShadow: `0 0 28px -6px color-mix(in oklab, ${color} 45%, transparent)`,
  };
}

export function MatchCard({
  match,
  prediction,
  now,
}: {
  match: Match;
  prediction: Prediction | null;
  /** Timestamp del request, levantado al parent para mantener pura la card. */
  now: number;
}) {
  const groupLabel = formatGroup(match.groupName);
  const groupColor = getGroupColor(match.groupName);
  const style = tintedStyle(groupColor);

  const isEditable = isMatchEditable(match, now);

  return (
    <article
      style={style}
      className="bg-background-container border-opacity-white-12 relative flex flex-col gap-3 rounded-md border px-4 py-3"
    >
      {groupLabel && (
        <p
          style={groupColor ? { color: groupColor } : undefined}
          className="text-xs font-bold tracking-wider uppercase"
        >
          {groupLabel}
        </p>
      )}

      <header className="text-text-gray flex items-center justify-between text-xs">
        <span>{formatKickoff(match.kickoffAt)}</span>
        <span className={STATUS_CLASS[match.status]}>
          {STATUS_LABEL[match.status]}
        </span>
      </header>

      {isEditable ? (
        <PredictionForm
          matchId={match.id}
          home={{ name: match.homeTeam, crest: match.homeTeamCrest }}
          away={{ name: match.awayTeam, crest: match.awayTeamCrest }}
          isKnockout={match.isKnockout}
          existing={{
            home: prediction?.homeScore ?? null,
            away: prediction?.awayScore ?? null,
            penaltyWinner: deriveSideFromTeam(
              prediction?.penaltyWinner ?? null,
              match.homeTeam,
              match.awayTeam,
            ),
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <TeamDisplay
            name={match.homeTeam}
            crest={match.homeTeamCrest}
            score={match.homeScore}
          />
          <TeamDisplay
            name={match.awayTeam}
            crest={match.awayTeamCrest}
            score={match.awayScore}
          />

          <PredictionReadOnly prediction={prediction} />
        </div>
      )}
    </article>
  );
}

function PredictionReadOnly({ prediction }: { prediction: Prediction | null }) {
  if (!prediction) {
    return (
      <p className="text-text-gray border-opacity-white-12 -mx-4 border-t px-4 pt-3 text-xs">
        No cargaste pronóstico para este partido.
      </p>
    );
  }
  return (
    <p className="text-text-gray border-opacity-white-12 -mx-4 border-t px-4 pt-3 text-xs">
      Tu pronóstico:{" "}
      <strong className="text-text-dark font-semibold tabular-nums">
        {prediction.homeScore} - {prediction.awayScore}
      </strong>
      {prediction.penaltyWinner && (
        <>
          {" "}
          · penales:{" "}
          <strong className="text-text-dark font-semibold">
            {prediction.penaltyWinner}
          </strong>
        </>
      )}
    </p>
  );
}
