import { describe, expect, it } from "vitest";

import { discoverSelectedImages, isSupportedImageFile } from "./discoverImages";

describe("image discovery", () => {
  it("recognizes image MIME types and common image extensions", () => {
    expect(isSupportedImageFile({ name: "photo.custom", type: "image/x-custom" })).toBe(true);
    expect(isSupportedImageFile({ name: "photo.HEIC", type: "" })).toBe(true);
    expect(isSupportedImageFile({ name: "photo.tiff", type: "" })).toBe(true);
    expect(isSupportedImageFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
  });

  it("retains exact filenames and relative paths while skipping non-images", () => {
    const result = discoverSelectedImages([
      {
        name: "P123_eye3.jpg",
        type: "image/jpeg",
        relativePath: "roll-1/P123_eye3.jpg"
      },
      {
        name: "readme.txt",
        type: "text/plain",
        relativePath: "readme.txt"
      }
    ]);

    expect(result).toEqual([
      {
        filename: "P123_eye3.jpg",
        relativePath: "roll-1/P123_eye3.jpg"
      }
    ]);
  });

  it("uses filename when no relative path is available", () => {
    expect(
      discoverSelectedImages([{ name: "image.png", type: "image/png", relativePath: "" }])
    ).toEqual([{ filename: "image.png", relativePath: "image.png" }]);
  });
});
