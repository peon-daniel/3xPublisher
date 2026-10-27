import { describe, expect, it } from "vitest";

import { collectDictionarySuggestions } from "./dictionarySuggestions";

describe("collectDictionarySuggestions", () => {
  it("suggests unknown identifiers once and counts distinct filenames", () => {
    expect(
      collectDictionarySuggestions(
        [
          { filename: "one.jpg", identifiers: ["d3", "D3", "rodinal"], source: "filename" },
          { filename: "two.jpg", identifiers: ["d3"], source: "xmp" }
        ],
        { rodinal: ["#rodinal"] }
      )
    ).toEqual([
      { identifier: "d3", source: "xmp", imageCount: 2 }
    ]);
  });

  it("ignores known and dismissed identifiers case-insensitively", () => {
    expect(
      collectDictionarySuggestions(
        [{ filename: "one.jpg", identifiers: ["D3", "fp100"], source: "xmp" }],
        { d3: ["#film"] },
        new Set(["FP100"])
      )
    ).toEqual([]);
  });
});
