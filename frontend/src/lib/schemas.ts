import { z } from "zod";

export const habitSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(80, "Name must be 80 characters or fewer"),
    schedule: z.enum(["daily", "weekly"]),
});

export type HabitInput = z.infer<typeof habitSchema>;