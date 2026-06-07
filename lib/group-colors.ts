/**
 * Color por grupo del Mundial 2026 (12 grupos: A..L).
 *
 * La paleta es de tono vibrante y moderno, distribuida alrededor del
 * espectro para que cada card sea reconocible de un vistazo. Los valores
 * son hex puros y se mezclan en runtime con el background del container
 * via `color-mix(in oklab, ...)`.
 */
const GROUP_COLORS: Record<string, string> = {
  GROUP_A: "#ff4d4d", // red
  GROUP_B: "#ff8c42", // orange
  GROUP_C: "#ffd24a", // gold
  GROUP_D: "#a3e635", // lime
  GROUP_E: "#34d399", // emerald
  GROUP_F: "#2dd4bf", // teal
  GROUP_G: "#38bdf8", // sky
  GROUP_H: "#6366f1", // indigo
  GROUP_I: "#8b5cf6", // violet
  GROUP_J: "#a855f7", // purple
  GROUP_K: "#ec4899", // pink
  GROUP_L: "#f43f5e", // rose
};

export function getGroupColor(groupName: string | null): string | null {
  if (!groupName) return null;
  return GROUP_COLORS[groupName] ?? null;
}
