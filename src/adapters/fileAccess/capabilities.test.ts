import { describe, expect, it } from "vitest";

import { detectFileAccessCapabilities } from "./capabilities";

describe("detectFileAccessCapabilities", () => {
  it("reports available file APIs", () => {
    const scope = {
      showOpenFilePicker: () => undefined,
      showSaveFilePicker: () => undefined,
      showDirectoryPicker: () => undefined,
      URL,
      document: {
        createElement: () => ({ webkitdirectory: false }),
        body: { appendChild: () => undefined }
      }
    };

    expect(detectFileAccessCapabilities(scope)).toEqual({
      openFilePicker: true,
      saveFilePicker: true,
      directoryPicker: true,
      directoryInput: true,
      download: true
    });
  });

  it("reports missing file APIs and download support", () => {
    expect(detectFileAccessCapabilities({})).toEqual({
      openFilePicker: false,
      saveFilePicker: false,
      directoryPicker: false,
      directoryInput: false,
      download: false
    });
  });
});
