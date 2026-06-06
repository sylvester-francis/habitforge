"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createHabit } from "@/lib/api";
import { habitSchema, type HabitInput } from "@/lib/schemas";

export function NewHabitForm() {
    const qc = useQueryClient();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<HabitInput>({
        resolver: zodResolver(habitSchema),
        defaultValues: { name: "", schedule: "daily" },
    });

    const mutation = useMutation({
        mutationFn: (input: HabitInput) => createHabit(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["habits"] });
            reset();
        },
    });

    return (
        <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
            <div className="w-full sm:flex-1">
                <input
                    {...register("name")}
                    placeholder="e.g. Read 20 pages"
                    className="w-full rounded-lg border border-iron-700 bg-iron-950/60 px-3 py-2 text-cream placeholder:text-cream-faint outline-none transition-colors focus:border-ember focus:ring-2 focus:ring-ember/30"
                />
                {errors.name && (
                    <p className="mt-1 font-mono text-xs text-red-400">
                        {errors.name.message}
                    </p>
                )}
            </div>
            <select
                {...register("schedule")}
                className="cursor-pointer rounded-lg border border-iron-700 bg-iron-950/60 px-3 py-2 text-cream outline-none transition-colors focus:border-ember focus:ring-2 focus:ring-ember/30"
            >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
            </select>
            <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-ember px-5 py-2 font-medium text-ash transition-all hover:bg-ember-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
                {isSubmitting ? "Forging…" : "Forge"}
            </button>
        </form>
    );
}