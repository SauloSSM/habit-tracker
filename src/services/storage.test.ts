import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadData } from "./storage";

const storageKey = "consistency-dashboard-v1";
let storedValues: Map<string, string>;

beforeEach(() => {
  storedValues = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
  });
});

describe("habit storage migration", () => {
  it("defaults an existing V1 habit to CHECK_IN", () => {
    storedValues.set(storageKey, JSON.stringify({
      version: 2,
      habits: [{
        id: "habit-1",
        name: "Read",
        description: "",
        category: "Personal",
        weekdays: [1],
        scheduleType: "FIXED_DAYS",
        createdAt: "2024-01-01",
        archived: false,
      }],
      checkIns: [],
      notes: [],
    }));

    expect(loadData().habits[0]?.trackingType).toBe("CHECK_IN");
  });
});
