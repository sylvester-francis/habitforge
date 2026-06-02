import { getHabit, getStreak } from "@/lib/api";

export default async function HabitDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const habitId = Number(id);

    const [habitResult, streakResult] = await Promise.allSettled([
        getHabit(habitId),
        getStreak(habitId),
    ]);

    if (habitResult.status === "rejected") {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p className="text-red-600">Could not load this habit.</p>
            </main>
        );
    }

    const habit = habitResult.value;
    const streak =
        streakResult.status === "fulfilled" ? streakResult.value.streak : null;

    return (
        <main className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-bold">{habit.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{habit.schedule}</p>
            <p className="mt-4 text-lg">
                Current streak:{" "}
                {streak === null ? (
                    <span className="text-gray-400">unavailable</span>
                ) : (
                    <span className="font-semibold">{streak}</span>
                )}
            </p>
        </main>
    );
}