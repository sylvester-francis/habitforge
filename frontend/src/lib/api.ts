\import type { Habit, CreateHabitRequest, StreakResponse } from "@/types/api";

const BASE - process.env.NEXT_PUBLIC_URL ?? "http://localhost:8080";

export async function listHabits(): Promise<Habit[]> {
    const res = await fetch(`${BASE}/api/habits`, { cache: "no-store" });
    if (!res.ok) throw new Error(`listHabits: ${res.status}`);
    return res.json();
}

export async function createHabit(body: CreateHabitRequest): Promise<Habit> {
    const res = await fetch(`${BASE}/api/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`createHabit: ${res.status}`);
    return res.json();
}

export async function getHabit(id: number): Promise<Habit> {
    const res = await fetch(`${BASE}/api/habits/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`getHabit: ${res.status}`);
    return res.json();
}

export async function getStreak(id: number): Promise<StreakResponse> {
    const res = await fetch(`${BASE}/api/habits/${id}/streak`, { cache: "no-store" });
    if (!res.ok) throw new Error(`getStreak: ${res.status}`);
    return res.json();
}