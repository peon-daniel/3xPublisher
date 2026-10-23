import { describe, expect, it } from "vitest";

import { createEmptyProject } from "../project/defaults";
import { serializeProject } from "./serializeProject";

describe("serializeProject", () => {
  it("serializes canonical project shape as valid JSON", () => {
    const project = createEmptyProject("project-1");
    project.dictionary = {
      eye3: ["#konicaeye"]
    };

    const text = serializeProject(project);
    const parsed = JSON.parse(text);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.project.id).toBe("project-1");
    expect(parsed.settings.defaultHashtagLimit).toBe(4);
    expect(parsed.dictionary.eye3).toEqual(["#konicaeye"]);
    expect(Array.isArray(parsed.groups)).toBe(true);
  });

  it("always emits a trailing newline for stable file output", () => {
    const text = serializeProject(createEmptyProject("project-2"));
    expect(text.endsWith("\n")).toBe(true);
  });
});
