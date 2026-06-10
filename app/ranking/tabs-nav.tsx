"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function TabsNav({ basePath = "/ranking" }: { basePath?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabs = [
    { href: basePath, label: "General" },
    { href: `${basePath}/fecha`, label: "Por fecha" },
    { href: `${basePath}/evolucion`, label: "Evolución" },
  ];
  // Preservamos query params (ej. ?scenario=) al cambiar de tab.
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";
  return (
    <nav className="border-opacity-white-12 flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={`${t.href}${suffix}`}
            className={
              "px-3 py-2 text-sm transition-colors " +
              (active
                ? "text-default border-default -mb-px border-b-2 font-semibold"
                : "text-text-gray hover:text-text-light")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
