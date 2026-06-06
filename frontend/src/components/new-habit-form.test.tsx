import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewHabitForm } from "./new-habit-form";
import * as api from "@/lib/api";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("NewHabitForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an error and does not submit when the name is empty", async () => {
    const create = vi.spyOn(api, "createHabit");
    const user = userEvent.setup();
    renderWithClient(<NewHabitForm />);

    await user.click(screen.getByRole("button", { name: /forge/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("submits the entered values when valid", async () => {
    const create = vi.spyOn(api, "createHabit").mockResolvedValue({
      id: 1,
      name: "Read",
      schedule: "daily",
      createdAt: "2026-05-19T00:00:00Z",
      archived: false,
    });
    const user = userEvent.setup();
    renderWithClient(<NewHabitForm />);

    await user.type(screen.getByPlaceholderText(/read 20 pages/i), "Read");
    await user.click(screen.getByRole("button", { name: /forge/i }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ name: "Read", schedule: "daily" }),
    );
    expect(create).toHaveBeenCalledTimes(1);
  });
});
