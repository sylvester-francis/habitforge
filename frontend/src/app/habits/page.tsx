import { HabitList } from "@/components/habit-list";
import { NewHabitForm } from "@/components/new-habit-form";

export default function HabitsPage() {
    return (
        <main className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-bold">Your habits</h1>
            <div className="mt-4">
                <NewHabitForm />
            </div>
            <div className="mt-6">
                <HabitList />
            </div>
        </main>
    );
}
