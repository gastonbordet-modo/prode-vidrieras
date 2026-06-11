"use client";

import { useActionState, useState } from "react";
import { joinBet, type BetActionState } from "@/app/casino/actions";
import type { BetView } from "@/lib/bet-view";

const kickoffFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const STATUS_LABEL: Record<BetView["status"], string> = {
  open: "Abierta",
  locked: "Cerrada",
  resolved: "Resuelta",
  cancelled: "Cancelada",
};

type TabKey = "fecha" | "mias" | "historico";

export function BetsList({
  deLaFecha,
  mias,
  historico,
}: {
  deLaFecha: BetView[];
  mias: BetView[];
  historico: BetView[];
}) {
  const [tab, setTab] = useState<TabKey>("fecha");

  const tabs: { key: TabKey; label: string; list: BetView[] }[] = [
    { key: "fecha", label: "De la fecha", list: deLaFecha },
    { key: "mias", label: "Mis apuestas", list: mias },
    { key: "historico", label: "Histórico", list: historico },
  ];
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <section className="flex flex-col gap-3">
      <div className="border-opacity-white-12 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "px-3 py-2 text-sm transition-colors " +
              (t.key === tab
                ? "text-default border-default -mb-px border-b-2 font-semibold"
                : "text-text-gray hover:text-text-light")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {current.list.length === 0 ? (
        <p className="text-text-gray py-6 text-center text-sm">
          No hay apuestas para mostrar acá.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {current.list.map((b) => (
            <BetCard key={b.id} bet={b} />
          ))}
        </div>
      )}
    </section>
  );
}

function Crest({ url }: { url: string | null }) {
  if (!url) return <div className="bg-opacity-white-12 h-5 w-5 rounded-sm" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={20} height={20} className="h-5 w-5" />;
}

function fmtDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function SideChip({ side }: { side: "pro" | "con" }) {
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-xs font-medium " +
        (side === "pro"
          ? "bg-default-40 text-text-light"
          : "bg-background-home-section text-text-gray")
      }
    >
      {side === "pro" ? "A favor" : "En contra"}
    </span>
  );
}

function BetCard({ bet }: { bet: BetView }) {
  const isPreview = bet.status === "open" || bet.status === "locked";

  return (
    <article className="bg-background-container border-opacity-white-12 flex flex-col gap-2 rounded-md border px-4 py-3">
      <header className="flex items-center justify-between gap-2">
        <div className="text-text-dark flex items-center gap-2 text-sm font-semibold">
          <Crest url={bet.homeTeamCrest} />
          <span>{bet.homeTeam}</span>
          <span className="text-text-gray font-normal">vs</span>
          <span>{bet.awayTeam}</span>
          <Crest url={bet.awayTeamCrest} />
        </div>
        <span className="text-text-gray text-xs">
          {STATUS_LABEL[bet.status]}
        </span>
      </header>

      <p className="text-text-gray text-xs">
        {kickoffFormatter.format(new Date(bet.kickoffIso))} hs
      </p>

      <p className="text-text-light text-sm">
        <strong className="text-text-dark">{bet.creatorNickname}</strong>{" "}
        apuesta a que <strong className="text-default">{bet.pickLabel}</strong>{" "}
        · {bet.amount} pts c/u
      </p>

      {bet.status === "cancelled" ? (
        <p className="text-text-gray text-sm">
          Cancelada — nadie se sumó en contra. Puntos devueltos.
        </p>
      ) : (
        <>
          <p className="text-text-gray text-sm">
            Pozo: <strong className="text-text-dark">{bet.pot} pts</strong> ·{" "}
            {bet.players.length} jugador{bet.players.length === 1 ? "" : "es"}
          </p>

          {isPreview && (
            <div className="text-text-gray flex flex-col gap-0.5 text-xs">
              <span>
                Si gana el lado a favor ({bet.proCount}): {bet.proPayout} pts c/u
                ({fmtDelta(bet.proPayout - bet.amount)})
              </span>
              <span>
                Si gana el lado en contra ({bet.conCount}):{" "}
                {bet.conPayout === null
                  ? "todavía nadie en contra"
                  : `${bet.conPayout} pts c/u (${fmtDelta(bet.conPayout - bet.amount)})`}
              </span>
            </div>
          )}

          {bet.status === "resolved" && bet.outcome && (
            <p className="text-text-light text-sm">
              Ganó el lado{" "}
              <strong>
                {bet.outcome === "pro" ? "a favor" : "en contra"}
              </strong>
              {bet.myDelta !== null && (
                <>
                  {" "}
                  · tu resultado:{" "}
                  <strong
                    className={
                      bet.myDelta >= 0
                        ? "text-default"
                        : "text-system-error-dark"
                    }
                  >
                    {fmtDelta(bet.myDelta)} pts
                  </strong>
                </>
              )}
            </p>
          )}
        </>
      )}

      {bet.players.length > 0 && (
        <ul className="flex flex-col gap-1">
          {bet.players.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-text-light">{p.nickname}</span>
              <SideChip side={p.side} />
            </li>
          ))}
        </ul>
      )}

      {bet.canJoin && <JoinButton betId={bet.id} />}
      {bet.isMine && bet.status === "open" && (
        <p className="text-text-gray text-xs">Ya estás en esta apuesta.</p>
      )}
    </article>
  );
}

function JoinButton({ betId }: { betId: number }) {
  const [state, action, pending] = useActionState<BetActionState, FormData>(
    async (prev, formData) => joinBet(prev, formData),
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="betId" value={betId} />
      <button
        type="submit"
        disabled={pending}
        className="bg-default text-text-light self-start rounded-md px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
      >
        {pending ? "Sumándote…" : "Sumarme"}
      </button>
      <span className="text-text-gray text-xs">
        Tu lado se deriva de tu pronóstico y queda fijo aunque después lo
        cambies.
      </span>
      {state?.error && (
        <span className="text-system-error-dark text-xs">{state.error}</span>
      )}
    </form>
  );
}
