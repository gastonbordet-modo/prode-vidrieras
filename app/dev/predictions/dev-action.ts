"use server";

import { notFound } from "next/navigation";
import type { SubmitPredictionState } from "@/app/actions";

/**
 * Stub del Server Action de predicciones. No toca la DB; solo loguea el
 * payload y devuelve { ok: true } para que el form muestre "Guardado".
 * Solo accesible en development; en prod retorna 404 vía notFound().
 */
export async function devSubmitPrediction(
  _prev: SubmitPredictionState,
  formData: FormData,
): Promise<SubmitPredictionState> {
  if (process.env.NODE_ENV !== "development") notFound();

  console.log("[dev/predictions] submit:", {
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    penaltyWinner: formData.get("penaltyWinner"),
  });

  return { ok: true };
}
