import { describe, expect, it } from "vitest";

import { generateHashtags, parseFilenameIdentifiers } from "./generateHashtags";

describe("filename hashtag generation", () => {
  it("parses identifiers after the first token using the documented separators", () => {
    expect(
      parseFilenameIdentifiers("P8260673_d3, fp100, halfframe, rodinal.jpg")
    ).toEqual(["d3", "fp100", "halfframe", "rodinal"]);
  });

  it("matches identifiers case-insensitively and ignores the first token", () => {
    expect(
      generateHashtags("P8260673_D3, FP100.jpg", {
        p8260673: ["#image-id"],
        d3: ["#film"],
        fp100: ["#stock"]
      })
    ).toEqual(["#film", "#stock"]);
  });

  it("preserves filename and dictionary order while expanding multiple values", () => {
    expect(
      generateHashtags("P1_eye3-halfframe rodinal.jpg", {
        eye3: ["#camera", "#compact"],
        halfframe: ["#half-frame"],
        rodinal: ["#developer"]
      })
    ).toEqual(["#camera", "#compact", "#half-frame", "#developer"]);
  });

  it("removes repeated hashtags case-insensitively and skips blank values", () => {
    expect(
      generateHashtags("P1_eye3 eye3, halfframe.jpg", {
        eye3: ["#camera", " ", "#CAMERA"],
        halfframe: ["#camera", "#film"]
      })
    ).toEqual(["#camera", "#film"]);
  });

  it("handles filenames with no extension or no identifiers", () => {
    expect(parseFilenameIdentifiers("P1_d3")).toEqual(["d3"]);
    expect(parseFilenameIdentifiers("P1.jpg")).toEqual([]);
    expect(parseFilenameIdentifiers("")).toEqual([]);
  });
});
