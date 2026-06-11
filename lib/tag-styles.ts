/**
 * Estilos de los tags. Mapeo estable tagId → variante de color, y de
 * variante → clases Tailwind del theme del YOY. 5 colores reutilizables
 * (un color puede repetirse entre tags); cada tag siempre el mismo color.
 * Ver specs/features/008-tags.md.
 */

import type { TagId } from "./tags";

export type TagVariant = "fucsia" | "blue" | "green" | "yellow" | "orange";

const VARIANT_CLASSES: Record<TagVariant, string> = {
  fucsia: "bg-default-20 text-default-dark",
  blue: "bg-blue-20 text-blue-dark",
  green: "bg-green-20 text-green-dark",
  yellow: "bg-opacity-yellow-20 text-yellow-dark",
  orange: "bg-orange-light text-orange-dark",
};

const TAG_VARIANT: Record<TagId, TagVariant> = {
  // Premios del torneo → fucsia (el color principal del theme)
  messi: "fucsia",
  el_diez: "fucsia",
  // Constancia / subcampeón → blue
  cebollita: "blue",
  mascherano: "blue",
  bilardista: "blue",
  // Buenas de fecha → green
  profeta: "green",
  comeback: "green",
  brujita: "green",
  el_loco: "green",
  // Malas → orange
  mufa: "orange",
  patadura: "orange",
  menottista: "orange",
  // Estilo cábala / frío → yellow
  pecho_frio: "yellow",
  cabulero: "yellow",
};

export function tagClasses(id: TagId): string {
  return VARIANT_CLASSES[TAG_VARIANT[id]];
}
