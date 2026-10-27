import { describe, expect, it, vi } from "vitest";

import { readSelectedDirectory } from "./readSelectedDirectory";

describe("readSelectedDirectory", () => {
  it("recursively reads files using explicitly selected folder access", async () => {
    const image = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const notes = new File(["notes"], "notes.txt", { type: "text/plain" });
    const nestedDirectory = {
      kind: "directory" as const,
      name: "roll-2",
      async getFileHandle() {
        throw new DOMException("Not found", "NotFoundError");
      },
      async *values() {
        yield {
          kind: "file" as const,
          name: "photo.jpg",
          getFile: async () => image
        };
      }
    };
    const directory = {
      kind: "directory" as const,
      name: "Photos",
      async getFileHandle() {
        throw new DOMException("Not found", "NotFoundError");
      },
      async *values() {
        yield nestedDirectory;
        yield {
          kind: "file" as const,
          name: "notes.txt",
          getFile: async () => notes
        };
      }
    };
    const picker = vi.fn().mockResolvedValue(directory);

    const result = await readSelectedDirectory(picker);

    expect(picker).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(result).toEqual({
      ok: true,
      directoryName: "Photos",
      handle: directory,
      files: [
        { file: image, relativePath: "Photos/roll-2/photo.jpg" },
        { file: notes, relativePath: "Photos/notes.txt" }
      ]
    });
  });

  it("treats a cancelled folder choice as cancellation", async () => {
    const picker = vi.fn().mockRejectedValue({ name: "AbortError" });

    await expect(readSelectedDirectory(picker)).resolves.toEqual({
      ok: false,
      cancelled: true
    });
  });

  it("reports folder read errors without hiding them", async () => {
    const directory = {
      kind: "directory" as const,
      name: "Photos",
      async getFileHandle() {
        throw new DOMException("Not found", "NotFoundError");
      },
      async *values() {
        throw new Error("permission revoked");
      }
    };

    await expect(readSelectedDirectory(async () => directory)).resolves.toEqual({
      ok: false,
      error: "Could not read the selected image folder: permission revoked"
    });
  });
});
