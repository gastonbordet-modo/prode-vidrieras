"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { chatMessages, matches, predictions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLockReason } from "@/lib/match-editable";
import { resolvePenaltyWinner } from "@/lib/penalty-winner";
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
  // El form manda "" cuando no se eligió todavía; lo tratamos como null.
  penaltyWinner: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.enum(["home", "away"]).nullable(),
    ),
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
    penaltyWinner: formData.get("penaltyWinner"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, parsed.data.matchId),
    columns: {
      id: true,
      kickoffAt: true,
      isKnockout: true,
      status: true,
      homeTeam: true,
      awayTeam: true,
    },
  });
  if (!match) return { error: "Partido no encontrado" };

  const lockReason = getLockReason(match, Date.now());
  if (lockReason !== null) {
    const messages: Record<typeof lockReason, string> = {
      not_scheduled: "El partido ya no acepta pronósticos",
      already_started: "El partido ya empezó, no se puede modificar",
    };
    return { error: messages[lockReason] };
  }

  // Si no es eliminatoria o no hay empate, ignoramos cualquier
  // penaltyWinner que haya llegado (defensa server-side). Si aplica
  // pero side es null, persistimos null (el bonus se pierde hasta
  // que el user elija).
  const penaltyWinner = resolvePenaltyWinner({
    side: parsed.data.penaltyWinner,
    isKnockout: match.isKnockout,
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });

  await db
    .insert(predictions)
    .values({
      userId: authUser.id,
      matchId: parsed.data.matchId,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      penaltyWinner,
    })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: {
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        penaltyWinner,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/");
  return { ok: true };
}

const MAX_CHAT_LEN = 500;

const chatSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío.")
    .max(MAX_CHAT_LEN),
});

export type PostChatMessageState = {
  ok?: true;
  error?: string;
} | null;

export async function postChatMessage(
  _prev: PostChatMessageState,
  formData: FormData,
): Promise<PostChatMessageState> {
  const { user } = await requireUser();

  const parsed = chatSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "El mensaje no es válido.",
    };
  }

  await db.insert(chatMessages).values({
    userId: user.id,
    text: parsed.data.text,
  });

  revalidatePath("/");
  return { ok: true };
}
