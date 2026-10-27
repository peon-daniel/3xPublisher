import { describe, expect, it, vi } from "vitest";

import { readSelectedProjectFile } from "./readers";

describe("readSelectedProjectFile", () => {
  it("returns selected file text and its filename", async () => {
    const result = await readSelectedProjectFile({
      name: "instagram-plan.json",
      text: vi.fn().mockResolvedValue('{"schemaVersion":1}')
    });

    expect(result).toEqual({
      ok: true,
      filename: "instagram-plan.json",
      text: '{"schemaVersion":1}'
    });
  });

  it("reports file read failures without fabricating content", async () => {
    const result = await readSelectedProjectFile({
      name: "instagram-plan.json",
      text: vi.fn().mockRejectedValue(new Error("permission denied"))
    });

    expect(result).toEqual({
      ok: false,
      filename: "instagram-plan.json",
      error: 'Could not read "instagram-plan.json": permission denied'
    });
  });
});
