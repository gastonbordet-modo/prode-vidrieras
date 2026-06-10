"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { RoundInfo } from "@/lib/ranking";

export function RoundSelect({
  rounds,
  selected,
}: {
  rounds: RoundInfo[];
  selected: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2">
      <span className="text-text-gray text-sm">Fecha</span>
      <select
        value={selected}
        disabled={pending}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams);
          params.set("round", e.target.value);
          startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
          });
        }}
        className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-50"
      >
        {rounds.map((r) => (
          <option key={r.number} value={r.number}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
