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
        <div className="mt-4 flex items-center gap-3">
            <span className="text-lg">
                Current streak:{" "}
                <span className="font-semibold">{data?.streak ?? "…"}</span>
            </span>
            <button
                onClick={() => checkIn.mutate()}
                disabled={checkIn.isPending}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
                {checkIn.isPending ? "Saving…" : "Mark done today"}
            </button>
            {checkIn.error && (
                <span className="text-sm text-red-600">Could not save — rolled back</span>
            )}
        </div>
    );
}
