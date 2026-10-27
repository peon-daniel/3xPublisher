import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROJECT_FILENAME,
  formatNumberedExportFilename,
  getNextNumberedExportFilename
} from "./fileNaming";

describe("file naming", () => {
  it("defines the canonical project filename", () => {
    expect(CANONICAL_PROJECT_FILENAME).toBe("instagram-plan.json");
  });

  it("formats numbered exports with at least three digits", () => {
    expect(formatNumberedExportFilename(1)).toBe("instagram-plan-001.json");
    expect(formatNumberedExportFilename(42)).toBe("instagram-plan-042.json");
    expect(formatNumberedExportFilename(1000)).toBe("instagram-plan-1000.json");
  });

  it("rejects invalid numbered export sequences", () => {
    expect(() => formatNumberedExportFilename(0)).toThrow(RangeError);
    expect(() => formatNumberedExportFilename(1.5)).toThrow(RangeError);
    expect(() => formatNumberedExportFilename(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it("starts numbered exports at 001 when none exist", () => {
    expect(getNextNumberedExportFilename([])).toBe("instagram-plan-001.json");
  });

  it("increments from the highest existing numbered export", () => {
    expect(
      getNextNumberedExportFilename([
        "instagram-plan.json",
        "instagram-plan-001.json",
        "instagram-plan-009.json",
        "notes.json",
        "instagram-plan-backup.json"
      ])
    ).toBe("instagram-plan-010.json");
  });

  it("increments beyond three digits without truncation", () => {
    expect(getNextNumberedExportFilename(["instagram-plan-999.json"])).toBe(
      "instagram-plan-1000.json"
    );
  });
});
