"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/ranking", label: "General" },
  { href: "/ranking/fecha", label: "Por fecha" },
  { href: "/ranking/evolucion", label: "Evolución" },
];

export function TabsNav() {
  const pathname = usePathname();
  return (
    <nav className="border-opacity-white-12 flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
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
