"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { betEntries, bets, matches, predictions } from "@/db/schema";
import { getActiveRound } from "@/lib/active-round";
import { requireUser } from "@/lib/auth";
import { deriveBetSide, outcomeFromScore } from "@/lib/bet-side";
import { getOpenBetsForUser } from "@/lib/bets";
import { getLockReason } from "@/lib/match-editable";

const MAX_OPEN_BETS = 5;

export type BetActionState = {
  ok?: true;
  error?: string;
} | null;

const createSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  pick: z.enum(["home", "draw", "away"]),
  amount: z.coerce.number().int().min(1).max(20),
});

export async function createBet(
  _prev: BetActionState,
  formData: FormData,
): Promise<BetActionState> {
  const { user } = await requireUser();

  const parsed = createSchema.safeParse({
    matchId: formData.get("matchId"),
    pick: formData.get("pick"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { matchId, pick, amount } = parsed.data;

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: {
      id: true,
      roundNumber: true,
      kickoffAt: true,
      status: true,
    },
  });
  if (!match) return { error: "Partido no encontrado." };

  const activeRound = await getActiveRound();
  if (match.roundNumber !== activeRound) {
    return { error: "Solo se puede apostar en partidos de la fecha activa." };
  }
  if (getLockReason(match, Date.now()) !== null) {
    return { error: "El partido ya empezó o no acepta apuestas." };
  }

  const prediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, user.id),
      eq(predictions.matchId, matchId),
    ),
    columns: { homeScore: true, awayScore: true },
  });
  if (!prediction) {
    return { error: "Cargá tu pronóstico para este partido primero." };
  }

  const predOutcome = outcomeFromScore(
    prediction.homeScore,
    prediction.awayScore,
  );
  if (predOutcome !== pick) {
    return { error: "El pick tiene que coincidir con tu pronóstico." };
  }

  const openBets = await getOpenBetsForUser(user.id);
  if (openBets.length >= MAX_OPEN_BETS) {
    return { error: `Llegaste al máximo de ${MAX_OPEN_BETS} apuestas abiertas.` };
  }

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(bets)
      .values({ creatorId: user.id, matchId, pick, amount, status: "open" })
      .returning({ id: bets.id });
    await tx.insert(betEntries).values({
      betId: created.id,
      userId: user.id,
      side: "pro",
    });
  });

  revalidatePath("/casino");
  return { ok: true };
}

const joinSchema = z.object({
  betId: z.coerce.number().int().positive(),
});

export async function joinBet(
  _prev: BetActionState,
  formData: FormData,
): Promise<BetActionState> {
  const { user } = await requireUser();

  const parsed = joinSchema.safeParse({ betId: formData.get("betId") });
  if (!parsed.success) {
    return { error: "Apuesta inválida." };
  }
  const { betId } = parsed.data;

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    columns: { id: true, creatorId: true, matchId: true, pick: true, status: true },
  });
  if (!bet) return { error: "La apuesta no existe." };
  if (bet.status !== "open") return { error: "La apuesta ya no está abierta." };
  if (bet.creatorId === user.id) {
    return { error: "No te podés sumar a tu propia apuesta." };
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, bet.matchId),
    columns: { id: true, kickoffAt: true, status: true },
  });
  if (!match) return { error: "Partido no encontrado." };
  if (getLockReason(match, Date.now()) !== null) {
    return { error: "El partido ya empezó; no te podés sumar." };
  }

  const existing = await db.query.betEntries.findFirst({
    where: and(eq(betEntries.betId, betId), eq(betEntries.userId, user.id)),
    columns: { id: true },
  });
  if (existing) return { error: "Ya estás en esta apuesta." };

  const prediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, user.id),
      eq(predictions.matchId, bet.matchId),
    ),
    columns: { homeScore: true, awayScore: true },
  });
  if (!prediction) {
    return { error: "Cargá tu pronóstico para este partido primero." };
  }

  const openBets = await getOpenBetsForUser(user.id);
  if (openBets.length >= MAX_OPEN_BETS) {
    return { error: `Llegaste al máximo de ${MAX_OPEN_BETS} apuestas abiertas.` };
  }

  const side = deriveBetSide(
    bet.pick,
    outcomeFromScore(prediction.homeScore, prediction.awayScore),
  );

  await db.insert(betEntries).values({ betId, userId: user.id, side });

  revalidatePath("/casino");
  return { ok: true };
}
