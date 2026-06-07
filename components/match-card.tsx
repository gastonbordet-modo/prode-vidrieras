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
  return dateFormatter.format(date).replace(",", " ·");
}

function formatGroup(group: string | null): string | null {
  if (!group) return null;
  // "GROUP_A" → "Grupo A"
  const letter = group.replace("GROUP_", "");
  return `Grupo ${letter}`;
}

function TeamRow({
  name,
  crest,
  align,
}: {
  name: string;
  crest: string | null;
  align: "left" | "right";
}) {
  const isTbd = name === "TBD";
  const label = isTbd ? (
    <span className="text-text-gray italic">Por definir</span>
  ) : (
    <span className="text-text-dark">{name}</span>
  );

  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={crest}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="bg-opacity-white-12 h-6 w-6 shrink-0 rounded-sm" />
      )}
      {label}
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const groupLabel = formatGroup(match.groupName);

  return (
    <article className="bg-background-container border-opacity-white-12 flex flex-col gap-3 rounded-md border px-4 py-3">
      <header className="text-text-gray flex items-center justify-between text-xs">
        <span>{formatKickoff(match.kickoffAt)}</span>
        <span className={STATUS_CLASS[match.status]}>
          {STATUS_LABEL[match.status]}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-base font-semibold">
        <TeamRow
          name={match.homeTeam}
          crest={match.homeTeamCrest}
          align="right"
        />

        {hasScore ? (
          <div className="text-text-dark tabular-nums">
            {match.homeScore} <span className="text-text-gray">-</span>{" "}
            {match.awayScore}
          </div>
        ) : (
          <div className="text-text-gray text-sm">vs</div>
        )}

        <TeamRow
          name={match.awayTeam}
          crest={match.awayTeamCrest}
          align="left"
        />
      </div>

      {groupLabel && (
        <footer className="text-text-gray border-opacity-white-12 -mx-4 -mb-3 border-t px-4 pt-2 pb-2 text-xs tracking-wider uppercase">
          {groupLabel}
        </footer>
      )}
    </article>
  );
}
