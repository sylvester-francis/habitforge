"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listHabits } from "@/lib/api";

export function HabitList() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["habits"],
        queryFn: listHabits,
    });

    if (isLoading) {
        return (
            <p className="font-mono text-sm text-cream-faint">Loading the ledger…</p>
        );
    }
    if (error) {
        return <p className="font-mono text-sm text-red-400">Failed to load.</p>;
    }
    if (!data || data.length === 0) {
        return (
            <p className="rounded-xl border border-dashed border-iron-700 px-4 py-8 text-center text-cream-dim">
                No habits yet. Forge your first one above.
            </p>
        );
    }

    return (
        <ul className="space-y-3">
            {data.map((h) => (
                <li key={h.id}>
                    <Link
                        href={`/habits/${h.id}`}
                        className="group flex items-center justify-between rounded-xl border border-iron-700 bg-iron-900/60 px-5 py-4 transition-all hover:border-ember/60 hover:bg-iron-850"
                    >
                        <span className="font-display text-lg text-cream transition-colors group-hover:text-ember-glow">
                            {h.name}
                        </span>
                        <span className="rounded-full border border-iron-700 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-cream-dim">
                            {h.schedule}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
