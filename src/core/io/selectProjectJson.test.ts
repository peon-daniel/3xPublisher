import { describe, expect, it } from "vitest";

import { selectProjectJsonFilename } from "./selectProjectJson";

describe("selectProjectJsonFilename", () => {
  it("chooses the highest numbered recognized project file", () => {
    expect(
      selectProjectJsonFilename([
        "notes.json",
        "instagram-plan.json",
        "instagram-plan-002.json",
        "instagram-plan-010.json"
      ])
    ).toBe("instagram-plan-010.json");
  });

  it("uses the canonical file when there are no numbered exports", () => {
    expect(selectProjectJsonFilename(["notes.json", "instagram-plan.json"])).toBe(
      "instagram-plan.json"
    );
  });

  it("ignores unrelated JSON files and malformed numbered names", () => {
    expect(
      selectProjectJsonFilename([
        "notes.json",
        "instagram-plan-2.json",
        "instagram-plan-final.json"
      ])
    ).toBeUndefined();
  });

  it("ignores sequence numbers outside the safe integer range", () => {
    expect(
      selectProjectJsonFilename(["instagram-plan-999999999999999999999.json"])
    ).toBeUndefined();
  });
});
