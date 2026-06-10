"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

const tabs = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  {
    href: "/ranking",
    label: "Ranking",
    match: (p: string) => p === "/ranking" || p.startsWith("/ranking/"),
  },
  {
    href: "/historial",
    label: "Historial",
    match: (p: string) => p === "/historial",
  },
];

/**
 * Tab bar principal de la app. Sticky en el tope para que siempre se vea
 * al scrollear. Centrada horizontalmente con underline en el activo.
 * Hace prefetch on hover además del default de Next, para que el primer
 * cambio de tab sienta instantáneo.
 */
export function MainTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  return (
    <nav className="bg-background-home border-opacity-white-12 sticky top-0 z-10 -mx-4 border-b">
      <div className="flex justify-center gap-1">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              onMouseEnter={() => prefetch(t.href)}
              onFocus={() => prefetch(t.href)}
              className={
                "px-4 py-3 text-sm transition-colors " +
                (active
                  ? "text-default border-default -mb-px border-b-2 font-semibold"
                  : "text-text-gray hover:text-text-light")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
