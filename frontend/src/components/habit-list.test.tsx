import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HabitList } from "./habit-list";
import * as api from "@/lib/api";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("HabitList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an empty state", async () => {
    vi.spyOn(api, "listHabits").mockResolvedValue([]);
    renderWithClient(<HabitList />);
    expect(await screen.findByText(/no habits yet/i)).toBeInTheDocument();
  });

  it("renders fetched habits", async () => {
    vi.spyOn(api, "listHabits").mockResolvedValue([
      {
        id: 1,
        name: "Read",
        schedule: "daily",
        createdAt: "2026-05-19T00:00:00Z",
        archived: false,
      },
    ]);
    renderWithClient(<HabitList />);
    expect(await screen.findByText("Read")).toBeInTheDocument();
  });

  it("hides archived habits", async () => {
    vi.spyOn(api, "listHabits").mockResolvedValue([
      {
        id: 1,
        name: "Read",
        schedule: "daily",
        createdAt: "2026-05-19T00:00:00Z",
        archived: false,
      },
      {
        id: 2,
        name: "Old habit",
        schedule: "weekly",
        createdAt: "2026-05-19T00:00:00Z",
        archived: true,
      },
    ]);
    renderWithClient(<HabitList />);
    expect(await screen.findByText("Read")).toBeInTheDocument();
    expect(screen.queryByText("Old habit")).not.toBeInTheDocument();
  });
});
