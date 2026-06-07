import type { matches } from "@/db/schema";

type Match = typeof matches.$inferSelect;

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
});

function formatKickoff(date: Date): string {
  // "mié 11 jun, 16:00" → reemplazamos la coma por punto separador
  return dateFormatter.format(date).replace(",", " ·");
}

function TeamLabel({ name }: { name: string }) {
  if (name === "TBD") {
    return <span className="text-text-gray italic">Por definir</span>;
  }
  return <span className="text-text-dark">{name}</span>;
}

export function MatchCard({ match }: { match: Match }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <article className="bg-background-container border-opacity-white-12 flex flex-col gap-3 rounded-md border px-4 py-3">
      <header className="text-text-gray flex items-center justify-between text-xs">
        <span>{formatKickoff(match.kickoffAt)}</span>
        <span className={STATUS_CLASS[match.status]}>
          {STATUS_LABEL[match.status]}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-base font-semibold">
        <div className="text-right">
          <TeamLabel name={match.homeTeam} />
        </div>

        {hasScore ? (
          <div className="text-text-dark tabular-nums">
            {match.homeScore} <span className="text-text-gray">-</span>{" "}
            {match.awayScore}
          </div>
        ) : (
          <div className="text-text-gray text-sm">vs</div>
        )}

        <div className="text-left">
          <TeamLabel name={match.awayTeam} />
        </div>
      </div>
    </article>
  );
}
