import { describe, expect, it } from "vitest";

import { formatShellTitle } from "./smoke";

describe("formatShellTitle", () => {
  it("appends Planner suffix", () => {
    expect(formatShellTitle("3xPublisher")).toBe("3xPublisher Planner");
  });
});
