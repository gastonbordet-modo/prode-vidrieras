"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { matches, predictions } from "@/db/schema";
import { getLockReason } from "@/lib/match-editable";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const submitSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(20),
  awayScore: z.coerce.number().int().min(0).max(20),
});

export type SubmitPredictionState = {
  ok?: true;
  error?: string;
} | null;

export async function submitPrediction(
  _prev: SubmitPredictionState,
  formData: FormData,
): Promise<SubmitPredictionState> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { error: "Sesión inválida. Volvé a entrar." };

  const parsed = submitSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, parsed.data.matchId),
    columns: { id: true, kickoffAt: true, isKnockout: true, status: true },
  });
  if (!match) return { error: "Partido no encontrado" };

  const lockReason = getLockReason(match, Date.now());
  if (lockReason !== null) {
    const messages: Record<typeof lockReason, string> = {
      knockout: "Los pronósticos de eliminatoria todavía no están disponibles",
      not_scheduled: "El partido ya no acepta pronósticos",
      already_started: "El partido ya empezó, no se puede modificar",
    };
    return { error: messages[lockReason] };
  }

  await db
    .insert(predictions)
    .values({
      userId: authUser.id,
      matchId: parsed.data.matchId,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      penaltyWinner: null,
    })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: {
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/");
  return { ok: true };
}
