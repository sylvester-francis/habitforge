import Link from "next/link";
import { HabitList } from "@/components/habit-list";
import { NewHabitForm } from "@/components/new-habit-form";

export default function HabitsPage() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-12">
            <Link
                href="/"
                className="font-mono text-xs uppercase tracking-[0.25em] text-cream-faint transition-colors hover:text-ember"
            >
                &larr; HabitForge
            </Link>

            <h1 className="mt-6 font-display text-4xl font-black tracking-tight text-cream">
                Your habits
            </h1>
            <p className="mt-2 text-cream-dim">
                Add a habit, then mark it done to build the streak.
            </p>

            <section className="mt-8 rounded-2xl border border-iron-700 bg-iron-900/70 p-6 shadow-[0_1px_0_0_rgba(255,168,103,0.06)_inset]">
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ember">
                    Forge a new habit
                </h2>
                <NewHabitForm />
            </section>

            <div className="mt-10">
                <HabitList />
            </div>
        </main>
    );
}
