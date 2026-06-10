"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const THRESHOLD_PX = 400;

/**
 * Botón "volver arriba" que aparece cuando el usuario scrolleó más de
 * THRESHOLD_PX. Fixed bottom-right, no tapa contenido importante.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      tabIndex={visible ? 0 : -1}
      className={
        "bg-default text-text-button fixed right-5 bottom-5 z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none " +
        (visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0")
      }
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
