"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCheckIn, getStreak } from "@/lib/api";

export function CheckIn({ habitId }: { habitId: number }) {
    const qc = useQueryClient();

    const { data } = useQuery({
        queryKey: ["streak", habitId],
        queryFn: () => getStreak(habitId),
    });

    const checkIn = useMutation({
        mutationFn: () => createCheckIn(habitId),
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: ["streak", habitId] });
            const prev = qc.getQueryData<{ streak: number }>(["streak", habitId]);
            qc.setQueryData(["streak", habitId], { streak: (prev?.streak ?? 0) + 1 });
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["streak", habitId], ctx.prev);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["streak", habitId] });
        },
    });

    return (
        <div className="mt-8 rounded-2xl border border-iron-700 bg-iron-900/60 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cream-faint">
                Current streak
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
                <span className="font-mono text-6xl font-bold leading-none text-ember-glow [text-shadow:0_0_24px_rgba(255,106,43,0.35)]">
                    {data?.streak ?? "·"}
                </span>
                <button
                    onClick={() => checkIn.mutate()}
                    disabled={checkIn.isPending}
                    className="rounded-full bg-ember px-6 py-3 font-medium text-ash shadow-[0_0_28px_-8px_var(--color-ember)] transition-all hover:bg-ember-glow hover:shadow-[0_0_34px_-4px_var(--color-ember)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {checkIn.isPending ? "Saving…" : "Mark done today"}
                </button>
            </div>
            {checkIn.error && (
                <p className="mt-3 font-mono text-xs text-red-400">
                    Could not save — rolled back.
                </p>
            )}
        </div>
    );
}
