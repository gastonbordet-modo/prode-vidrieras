"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { syncFromApi, type SyncResult } from "@/lib/sync";

export type SyncState = {
  ok?: true;
  result?: SyncResult;
  error?: string;
} | null;

export async function triggerManualSync(
  _prev: SyncState,
  _formData: FormData,
): Promise<SyncState> {
  await requireAdmin();

  try {
    const result = await syncFromApi();
    revalidatePath("/admin/sync");
    revalidatePath("/");
    return { ok: true, result };
  } catch (err) {
    console.error("[admin/sync] failed:", err);
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
