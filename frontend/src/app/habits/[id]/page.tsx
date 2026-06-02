import Link from "next/link";
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
            <main className="mx-auto max-w-2xl px-6 py-12">
                <p className="font-mono text-sm text-red-400">
                    Could not load this habit.
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl px-6 py-12">
            <Link
                href="/habits"
                className="font-mono text-xs uppercase tracking-[0.25em] text-cream-faint transition-colors hover:text-ember"
            >
                &larr; All habits
            </Link>

            <div className="mt-6 flex items-center gap-3">
                <h1 className="font-display text-4xl font-black tracking-tight text-cream">
                    {habit.name}
                </h1>
                <span className="rounded-full border border-iron-700 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-cream-dim">
                    {habit.schedule}
                </span>
            </div>

            <CheckIn habitId={habitId} />
        </main>
    );
}
