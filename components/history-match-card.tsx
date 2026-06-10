import type { CSSProperties } from "react";
import type { matches, predictions } from "@/db/schema";
import { getGroupColor } from "@/lib/group-colors";
import { score } from "@/lib/scoring";
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
  };
}

function isMatchFinished(m: Match): m is Match & {
  homeScore: number;
  awayScore: number;
} {
  return (
    m.status === "finished" && m.homeScore !== null && m.awayScore !== null
  );
}

function pointsBadge(points: number, isExact: boolean) {
  if (isExact) {
    return (
      <span className="bg-system-success-light text-system-success-dark inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold">
        Exacto +{points}
      </span>
    );
  }
  if (points >= 5) {
    return (
      <span className="bg-yellow-light text-yellow-dark inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold">
        Ganador +{points}
      </span>
    );
  }
  if (points > 0) {
    return (
      <span className="bg-opacity-white-12 text-text-light inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold">
        +{points}
      </span>
    );
  }
  return (
    <span className="text-text-gray inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs">
      +0
    </span>
  );
}

export function HistoryMatchCard({
  match,
  prediction,
}: {
  match: Match;
  prediction: Prediction | null;
}) {
  const groupLabel = formatGroup(match.groupName);
  const groupColor = getGroupColor(match.groupName);
  const style = tintedStyle(groupColor);

  let scored: { points: number; isExact: boolean } | null = null;
  if (prediction && isMatchFinished(match)) {
    scored = score(
      {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        penaltyWinner: prediction.penaltyWinner,
      },
      {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        penaltyWinner: match.penaltyWinner,
        isKnockout: match.isKnockout,
      },
    );
  }

  return (
    <article
      style={style}
      className="bg-background-container border-opacity-white-12 flex flex-col gap-3 rounded-md border px-4 py-3"
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
      </div>

      <div className="border-opacity-white-12 -mx-4 border-t px-4 pt-3">
        {prediction ? (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-text-gray">
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
            </span>
            {scored ? (
              pointsBadge(scored.points, scored.isExact)
            ) : (
              <span className="text-text-gray italic">Aún sin jugar</span>
            )}
          </div>
        ) : (
          <p className="text-text-gray text-xs italic">
            {isMatchFinished(match)
              ? "No cargaste pronóstico"
              : "Aún sin jugarse"}
          </p>
        )}
      </div>
    </article>
  );
}
