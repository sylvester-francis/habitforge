"use client";

import { useQuery } from "@tanstack/react-query";
import { listHabits } from "@/lib/api";

export function HabitList() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["habits"],
        queryFn: listHabits,
    });

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p className="text-red-600">Failed to load</p>;
    if (!data || data.length === 0) return <p>No habits yet.</p>;

    return (
        <ul className="space-y-2">
            {data.map((h) => (
                <li key={h.id} className="rounded border p-3">
                    {h.name} <span className="text-gray-500 text-sm">{h.schedule}</span>
                </li>
            ))}
        </ul>
    );
}