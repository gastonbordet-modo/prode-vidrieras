"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  userId: z.uuid(),
});

export type DeleteUserState = {
  ok?: true;
  error?: string;
} | null;

export async function deleteUser(
  _prev: DeleteUserState,
  formData: FormData,
): Promise<DeleteUserState> {
  const { user: admin } = await requireAdmin();

  const parsed = schema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  if (parsed.data.userId === admin.id) {
    return { error: "No podés borrarte a vos mismo" };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.userId),
    columns: { id: true },
  });
  if (!target) return { error: "Usuario no encontrado" };

  await db.delete(users).where(eq(users.id, parsed.data.userId));

  revalidatePath("/admin/users");
  revalidatePath("/");
  return { ok: true };
}
