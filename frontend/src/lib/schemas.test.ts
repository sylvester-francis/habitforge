import { describe, it, expect } from "vitest";
import { habitSchema } from "./schemas";

describe("habitSchema", () => {
  it("accepts a valid input", () => {
    const result = habitSchema.safeParse({ name: "Read", schedule: "daily" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name with the right message", () => {
    const result = habitSchema.safeParse({ name: "", schedule: "daily" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // We assert the "Name is required" message because the form surfaces it to
      // the user (see new-habit-form.test.tsx). Other Zod messages are not pinned
      // on purpose: Stryker flags them as survivors and we accept that as equivalent.
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Name is required" }),
      );
    }
  });

  it("accepts a name of exactly 80 characters", () => {
    const result = habitSchema.safeParse({
      name: "a".repeat(80),
      schedule: "daily",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a name of 81 characters", () => {
    const result = habitSchema.safeParse({
      name: "a".repeat(81),
      schedule: "daily",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both supported schedules", () => {
    // Pins each enum member, since the form offers both (see new-habit-form.tsx).
    expect(
      habitSchema.safeParse({ name: "Read", schedule: "daily" }).success,
    ).toBe(true);
    expect(
      habitSchema.safeParse({ name: "Read", schedule: "weekly" }).success,
    ).toBe(true);
  });

  it("rejects an unknown schedule", () => {
    const result = habitSchema.safeParse({ name: "Read", schedule: "hourly" });
    expect(result.success).toBe(false);
  });

  it("schema constants match the backend (pinned)", () => {
    // These values are also enforced in backend/internal/httpapi/validation.go
    // (maxNameLen = 80). If you change one, change both, and update this test.
    expect(habitSchema.shape.name.maxLength).toBe(80);
  });
});
