import type { Habit, CreateHabitRequest, StreakResponse } from "@/types/api";

// On the server (e.g. the habit detail page, which fetches in a Server
// Component) "localhost" points at the Next.js container itself, so we use the
// internal Docker hostname when one is provided. In the browser we use the
// public URL baked in at build time. Both fall back to localhost for local dev.
const BASE =
    typeof window === "undefined"
        ? process.env.INTERNAL_API_URL ??
          process.env.NEXT_PUBLIC_API_URL ??
          "http://localhost:8080"
        : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

export async function createCheckIn(habitId: number): Promise<void> {
    const res = await fetch(`${BASE}/api/habits/${habitId}/checkins`, {
        method: "POST",
    });
    if (!res.ok) throw new Error(`createCheckIn: ${res.status}`);
}
