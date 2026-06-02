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

    return (
        <div className="space-y-2">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Habit name"
                className="border rounded px-2 py-1 w-full"
            />
            <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as "daily" | "weekly")}
                className="border rounded px-2 py-1"
            >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
            </select>
            <button
                onClick={() => mutation.mutate({ name, schedule })}
                disabled={mutation.isPending || !name}
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {mutation.isPending ? "Creating..." : "Create"}
            </button>
            {mutation.error && (
                <p className="text-red-600 text-sm">Could not create habit</p>
            )}
        </div>
    );
}
