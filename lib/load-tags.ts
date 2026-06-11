/**
 * Carga los datos necesarios y computa los tags de todos los usuarios.
 * Helper de servidor reusado por home, ranking, historial y chat.
 *
 * On-demand (v1): con ~10 usuarios el costo es trivial. Devuelve además un
 * Record serializable para pasar a Client Components.
 */

import { db } from "@/db/client";
import { computeAllTags, type Tag } from "@/lib/tags";

export async function loadTagsByUser(): Promise<Map<string, Tag[]>> {
  const [users, predictions, matches, adjustments] = await Promise.all([
    db.query.users.findMany(),
    db.query.predictions.findMany(),
    db.query.matches.findMany(),
    db.query.scoreAdjustments.findMany(),
  ]);

  return computeAllTags({ users, predictions, matches, adjustments });
}

/** Versión serializable (Record) para props de Client Components. */
export function tagsToRecord(map: Map<string, Tag[]>): Record<string, Tag[]> {
  return Object.fromEntries(map);
}
