import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { appState } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  LAST_CHAT_CRON_KEY,
  type LastChatCron,
} from "@/lib/clear-chat";
import { LAST_SYNC_KEY, type LastSync } from "@/lib/sync";
import { ClearChatButton } from "./clear-chat-button";
import { SyncButton } from "./sync-button";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

function parseLastSync(value: string): LastSync | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "at" in parsed &&
      typeof (parsed as { at: unknown }).at === "string"
    ) {
      return parsed as LastSync;
    }
    return null;
  } catch {
    return null;
  }
}

function parseLastChatCron(value: string): LastChatCron | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "at" in parsed &&
      typeof (parsed as { at: unknown }).at === "string" &&
      "cleared" in parsed &&
      typeof (parsed as { cleared: unknown }).cleared === "boolean" &&
      "reason" in parsed &&
      typeof (parsed as { reason: unknown }).reason === "string"
    ) {
      return parsed as LastChatCron;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function AdminSyncPage() {
  await requireAdmin();

  const rows = await db.query.appState.findMany({
    where: inArray(appState.key, [LAST_SYNC_KEY, LAST_CHAT_CRON_KEY]),
  });
  const lastSync =
    rows.find((r) => r.key === LAST_SYNC_KEY) &&
    parseLastSync(rows.find((r) => r.key === LAST_SYNC_KEY)!.value);
  const lastChatCron =
    rows.find((r) => r.key === LAST_CHAT_CRON_KEY) &&
    parseLastChatCron(
      rows.find((r) => r.key === LAST_CHAT_CRON_KEY)!.value,
    );

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-1">
        <p className="text-text-gray text-xs tracking-wider uppercase">
          Admin
        </p>
        <h2 className="text-text-dark text-2xl font-bold">Sync</h2>
        <p className="text-text-gray text-sm">
          Dispara <code>syncFromApi()</code> contra football-data.org.
          El cron diario corre a las 5:00 UTC.
        </p>
      </header>

      <div className="bg-background-container border-opacity-white-12 flex flex-col gap-3 rounded-md border px-5 py-4">
        <h3 className="text-text-dark text-sm font-semibold tracking-wider uppercase">
          Última corrida
        </h3>
        {lastSync ? (
          <dl className="text-text-light grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-gray">Cuándo</dt>
            <dd>{dateFmt.format(new Date(lastSync.at))}</dd>
            <dt className="text-text-gray">Total</dt>
            <dd>{lastSync.total}</dd>
            <dt className="text-text-gray">Creados</dt>
            <dd>{lastSync.created}</dd>
            <dt className="text-text-gray">Actualizados</dt>
            <dd>{lastSync.updated}</dd>
            <dt className="text-text-gray">Reprogramados</dt>
            <dd>{lastSync.reprogrammed}</dd>
          </dl>
        ) : (
          <p className="text-text-gray text-sm">Nunca corrió.</p>
        )}
      </div>

      <SyncButton />

      <div className="border-opacity-white-12 border-t pt-8">
        <header className="space-y-1">
          <h2 className="text-text-dark text-2xl font-bold">Chat</h2>
          <p className="text-text-gray text-sm">
            El cron diario corre a las 5:30 UTC. Limpia el chat 24h después
            del último partido de la fecha anterior.
          </p>
        </header>

        <div className="bg-background-container border-opacity-white-12 mt-4 flex flex-col gap-3 rounded-md border px-5 py-4">
          <h3 className="text-text-dark text-sm font-semibold tracking-wider uppercase">
            Última corrida
          </h3>
          {lastChatCron ? (
            <dl className="text-text-light grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-text-gray">Cuándo</dt>
              <dd>{dateFmt.format(new Date(lastChatCron.at))}</dd>
              <dt className="text-text-gray">Limpiado</dt>
              <dd>{lastChatCron.cleared ? "Sí" : "No"}</dd>
              <dt className="text-text-gray">Motivo</dt>
              <dd>{lastChatCron.reason}</dd>
            </dl>
          ) : (
            <p className="text-text-gray text-sm">Nunca corrió.</p>
          )}
        </div>

        <div className="mt-4">
          <ClearChatButton />
        </div>
      </div>
    </section>
  );
}
