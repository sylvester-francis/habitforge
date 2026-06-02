import { listHabits } from "@/lib/api";

export default async function HabitsPage() {
    const habits = await listHabits();

    return (
        <main className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-bold">Your habits</h1>
            <ul className="mt-4 space-y-2">
                {habits.map((h) => (
                    <li key={h.id} className="rounded border p-3">
                        <span className="font-medium">{h.name}</span>
                        <span className="ml-2 text-sm text-gray-500">{h.schedule}</span>
                    </li>
                ))}
            </ul>
        </main>
    );
}