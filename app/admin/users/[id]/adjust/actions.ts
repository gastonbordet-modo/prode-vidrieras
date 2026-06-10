"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { scoreAdjustments, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  userId: z.uuid(),
  points: z.coerce
    .number()
    .int()
    .min(-100)
    .max(100)
    .refine((n) => n !== 0, "Tiene que ser distinto de 0"),
  reason: z.string().trim().min(3, "Mínimo 3 caracteres").max(200),
});

export type AdjustPointsState = {
  ok?: true;
  error?: string;
} | null;

export async function adjustPoints(
  _prev: AdjustPointsState,
  formData: FormData,
): Promise<AdjustPointsState> {
  const { user: admin } = await requireAdmin();

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    points: formData.get("points"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  if (parsed.data.userId === admin.id) {
    return { error: "No podés ajustarte puntos a vos mismo" };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.userId),
    columns: { id: true },
  });
  if (!target) return { error: "Usuario no encontrado" };

  await db.insert(scoreAdjustments).values({
    userId: parsed.data.userId,
    points: parsed.data.points,
    reason: parsed.data.reason,
    createdBy: admin.id,
  });

  revalidatePath(`/admin/users/${parsed.data.userId}/adjust`);
  revalidatePath("/admin/users");
  revalidatePath("/");
  return { ok: true };
}
