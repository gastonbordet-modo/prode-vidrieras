import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appState } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LAST_SYNC_KEY, type LastSync } from "@/lib/sync";
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

export default async function AdminSyncPage() {
  await requireAdmin();

  const row = await db.query.appState.findFirst({
    where: eq(appState.key, LAST_SYNC_KEY),
  });
  const lastSync = row ? parseLastSync(row.value) : null;

  return (
    <section className="flex flex-col gap-6">
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
    </section>
  );
}
