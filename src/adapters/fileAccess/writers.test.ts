import { describe, expect, it, vi } from "vitest";

import { downloadTextFile, writeSelectedFile } from "./writers";

describe("writeSelectedFile", () => {
  it("reports success only after writing and closing", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const createWritable = vi.fn().mockResolvedValue({ write, close });

    await expect(writeSelectedFile({ createWritable }, '{"ok":true}')).resolves.toEqual({
      ok: true
    });
    expect(write).toHaveBeenCalledWith('{"ok":true}');
    expect(close).toHaveBeenCalledOnce();
  });

  it("aborts and reports a failed write", async () => {
    const abort = vi.fn().mockResolvedValue(undefined);
    const writable = {
      write: vi.fn().mockRejectedValue(new Error("disk full")),
      close: vi.fn(),
      abort
    };

    await expect(
      writeSelectedFile({ createWritable: vi.fn().mockResolvedValue(writable) }, "{}")
    ).resolves.toEqual({
      ok: false,
      error: "Could not save the selected file: disk full."
    });
    expect(abort).toHaveBeenCalledOnce();
    expect(writable.close).not.toHaveBeenCalled();
  });

  it("includes cleanup failures in the reported write error", async () => {
    const writable = {
      write: vi.fn().mockRejectedValue(new Error("write failed")),
      close: vi.fn(),
      abort: vi.fn().mockRejectedValue(new Error("abort failed"))
    };

    const result = await writeSelectedFile(
      { createWritable: vi.fn().mockResolvedValue(writable) },
      "{}"
    );

    expect(result).toEqual({
      ok: false,
      error: "Could not save the selected file: write failed. Could not abort the incomplete write: abort failed"
    });
  });
});

describe("downloadTextFile", () => {
  it("initiates a JSON download and releases the temporary URL", () => {
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn()
    };
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();

    const result = downloadTextFile('{"ok":true}', "instagram-plan-001.json", {
      createAndAppendAnchor: vi.fn().mockReturnValue(anchor),
      url: { createObjectURL, revokeObjectURL }
    });

    expect(result).toEqual({ ok: true });
    expect(anchor.href).toBe("blob:test");
    expect(anchor.download).toBe("instagram-plan-001.json");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("reports failures to initiate a download", () => {
    const result = downloadTextFile("{}", "instagram-plan.json", {
      createAndAppendAnchor: vi.fn().mockImplementation(() => {
        throw new Error("blocked");
      }),
      url: {
        createObjectURL: vi.fn().mockReturnValue("blob:test"),
        revokeObjectURL: vi.fn()
      }
    });

    expect(result).toEqual({
      ok: false,
      error: "Could not start the JSON download: blocked."
    });
  });
});
