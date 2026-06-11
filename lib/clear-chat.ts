import { eq, max } from "drizzle-orm";
import { db } from "@/db/client";
import { appState, chatMessages, matches } from "@/db/schema";
import { deriveActiveRound } from "@/lib/active-round";

/**
 * Key en `app_state` que registra el último round_number cuyo chat ya
 * fue limpiado. Si el active round avanza más allá de este valor y ya
 * pasó la ventana de 24h, el cron limpia y actualiza este key.
 */
export const LAST_CLEARED_CHAT_ROUND_KEY = "last_cleared_chat_round";

/** Marca de la última corrida del cron de limpieza, para mostrar en /admin. */
export const LAST_CHAT_CRON_KEY = "last_chat_cron";

export type LastChatCron = {
  at: string; // ISO timestamp
  cleared: boolean;
  reason: string;
};

const GRACE_MS = 24 * 60 * 60 * 1000;

export type ShouldClearChatInput = {
  activeRound: number | null;
  lastClearedRound: number; // 0 si nunca corrió
  /**
   * Max(kickoff_at) entre los partidos con round_number === activeRound - 1.
   * `null` si no existen (estamos todavía en la primera fecha o no hay
   * fecha previa).
   */
  previousRoundEndMs: number | null;
  nowMs: number;
};

export type ShouldClearChatDecision =
  | { clear: false; reason: string }
  | { clear: true; targetRound: number; truncate: boolean; reason: string };

/**
 * Decisión pura: ¿debería el cron limpiar el chat ahora?
 *
 * Reglas:
 *  - Sin fecha activa → no limpiar.
 *  - active <= lastCleared → ya estamos al día.
 *  - Sin fecha previa (primera fecha del torneo) → no truncar, pero
 *    avanzamos el cursor para no re-evaluar esto cada día.
 *  - Fecha previa terminó hace < 24h → ventana de cortesía, esperar.
 *  - Si no, limpiar y avanzar cursor.
 */
export function shouldClearChat(
  input: ShouldClearChatInput,
): ShouldClearChatDecision {
  const { activeRound, lastClearedRound, previousRoundEndMs, nowMs } = input;

  if (activeRound === null) {
    return { clear: false, reason: "No hay fecha activa." };
  }

  if (activeRound <= lastClearedRound) {
    return {
      clear: false,
      reason: `Ya limpiado hasta la fecha ${lastClearedRound}.`,
    };
  }

  if (previousRoundEndMs === null) {
    return {
      clear: true,
      targetRound: activeRound,
      truncate: false,
      reason: `Sin fecha previa. Cursor avanzado a ${activeRound}.`,
    };
  }

  const elapsed = nowMs - previousRoundEndMs;
  if (elapsed < GRACE_MS) {
    const hoursLeft = Math.ceil((GRACE_MS - elapsed) / (60 * 60 * 1000));
    return {
      clear: false,
      reason: `Fecha ${activeRound - 1} terminó hace poco. Faltan ~${hoursLeft}h.`,
    };
  }

  return {
    clear: true,
    targetRound: activeRound,
    truncate: true,
    reason: `Pasaron las 24h post fecha ${activeRound - 1}.`,
  };
}

/**
 * Lee del schema los datos necesarios para evaluar `shouldClearChat`.
 * Separado de la decisión para poder testear sin DB.
 */
export async function loadClearChatInputs(
  nowMs: number,
): Promise<ShouldClearChatInput> {
  const statusRows = await db
    .select({ roundNumber: matches.roundNumber, status: matches.status })
    .from(matches);
  const activeRound = deriveActiveRound(statusRows);

  const lastClearedRow = await db.query.appState.findFirst({
    where: eq(appState.key, LAST_CLEARED_CHAT_ROUND_KEY),
  });
  const lastClearedRound = lastClearedRow
    ? Number(lastClearedRow.value) || 0
    : 0;

  let previousRoundEndMs: number | null = null;
  if (activeRound !== null && activeRound > 1) {
    const [prevRow] = await db
      .select({ maxKickoff: max(matches.kickoffAt) })
      .from(matches)
      .where(eq(matches.roundNumber, activeRound - 1));
    const maxKickoff = prevRow?.maxKickoff ?? null;
    previousRoundEndMs = maxKickoff ? new Date(maxKickoff).getTime() : null;
  }

  return { activeRound, lastClearedRound, previousRoundEndMs, nowMs };
}

/**
 * Ejecuta la rutina del cron: evalúa, limpia si corresponde, persiste
 * el cursor y la marca de última corrida.
 */
export async function runClearChatCron(
  nowMs: number = Date.now(),
): Promise<LastChatCron> {
  const inputs = await loadClearChatInputs(nowMs);
  const decision = shouldClearChat(inputs);

  if (decision.clear) {
    if (decision.truncate) {
      await db.delete(chatMessages);
    }
    await db
      .insert(appState)
      .values({
        key: LAST_CLEARED_CHAT_ROUND_KEY,
        value: String(decision.targetRound),
      })
      .onConflictDoUpdate({
        target: appState.key,
        set: {
          value: String(decision.targetRound),
          updatedAt: new Date(),
        },
      });
  }

  const last: LastChatCron = {
    at: new Date(nowMs).toISOString(),
    cleared: decision.clear,
    reason: decision.reason,
  };

  await db
    .insert(appState)
    .values({
      key: LAST_CHAT_CRON_KEY,
      value: JSON.stringify(last),
    })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value: JSON.stringify(last), updatedAt: new Date() },
    });

  return last;
}
