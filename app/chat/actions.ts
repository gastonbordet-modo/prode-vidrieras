"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { chatMessages } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const MAX_LEN = 500;

const schema = z.object({
  text: z.string().trim().min(1, "El mensaje no puede estar vacío.").max(MAX_LEN),
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

  const parsed = schema.safeParse({
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "El mensaje no es válido.",
    };
  }

  await db.insert(chatMessages).values({
    userId: user.id,
    text: parsed.data.text,
  });

  revalidatePath("/chat");
  return { ok: true };
}
