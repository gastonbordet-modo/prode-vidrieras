"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tagClasses } from "@/lib/tag-styles";
import type { Tag } from "@/lib/tags";

const TOOLTIP_WIDTH = 220;

/**
 * Chip de un tag con su apodo. Tooltip por hover en desktop (title) y por
 * tap en mobile. El popover se renderiza en un portal con posición fija
 * para que no lo recorte ningún contenedor con overflow (ranking, chat).
 */
export function TagChip({ tag }: { tag: Tag }) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!coords) return;
    function close() {
      setCoords(null);
    }
    function onDoc(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("click", onDoc);
    // Cualquier scroll/resize invalida la posición fija: cerramos.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", onDoc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [coords]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (coords) {
      setCoords(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(
      8,
      Math.min(r.left, window.innerWidth - TOOLTIP_WIDTH - 8),
    );
    setCoords({ top: r.bottom + 4, left });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={tag.description}
        onClick={toggle}
        className={
          "rounded-full px-1.5 py-0.5 align-middle text-[10px] leading-none font-semibold " +
          tagClasses(tag.id)
        }
      >
        {tag.name}
      </button>
      {coords &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              maxWidth: TOOLTIP_WIDTH,
            }}
            className="bg-background-dark text-text-light border-opacity-white-12 z-50 w-max rounded-md border px-2 py-1 text-xs font-normal shadow-lg"
          >
            {tag.description}
          </span>,
          document.body,
        )}
    </>
  );
}

/** Lista inline de chips. No renderiza nada si el usuario no tiene tags. */
export function TagChips({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {tags.map((t) => (
        <TagChip key={t.id} tag={t} />
      ))}
    </span>
  );
}
