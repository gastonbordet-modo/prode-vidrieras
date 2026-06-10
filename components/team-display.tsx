export function TeamDisplay({
  name,
  crest,
  score,
}: {
  name: string;
  crest: string | null;
  score: number | null;
}) {
  const isTbd = name === "TBD";
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={crest}
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
          <span className="text-text-dark truncate font-semibold">{name}</span>
        )}
      </div>
      <span className="text-text-dark shrink-0 text-xl font-bold tabular-nums">
        {score ?? "–"}
      </span>
    </div>
  );
}
