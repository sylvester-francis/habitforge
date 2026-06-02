import { getHabit } from "@/lib/api";
import { CheckIn } from "@/components/check-in";

export default async function HabitDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const habitId = Number(id);

    let habit;
    try {
        habit = await getHabit(habitId);
    } catch {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p className="text-red-600">Could not load this habit.</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-bold">{habit.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{habit.schedule}</p>
            <CheckIn habitId={habitId} />
        </main>
    );
}
