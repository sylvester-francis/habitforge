"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createHabit } from "@/lib/api";

export function NewHabitForm() {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [schedule, setSchedule] = useState<"daily" | "weekly">("daily");

    const mutation = useMutation({
        mutationFn: createHabit,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["habits"] });
            setName("");
        },
    });

    const fieldClasses =
        "rounded-lg border border-iron-700 bg-iron-950/60 px-3 py-2 text-cream placeholder:text-cream-faint outline-none transition-colors focus:border-ember focus:ring-2 focus:ring-ember/30";

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Read 20 pages"
                className={`${fieldClasses} w-full sm:flex-1`}
            />
            <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as "daily" | "weekly")}
                className={`${fieldClasses} cursor-pointer`}
            >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
            </select>
            <button
                onClick={() => mutation.mutate({ name, schedule })}
                disabled={mutation.isPending || !name}
                className="rounded-lg bg-ember px-5 py-2 font-medium text-ash transition-all hover:bg-ember-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
                {mutation.isPending ? "Forging…" : "Forge"}
            </button>
            {mutation.error && (
                <p className="font-mono text-xs text-red-400 sm:hidden">
                    Could not create habit
                </p>
            )}
        </div>
    );
}
