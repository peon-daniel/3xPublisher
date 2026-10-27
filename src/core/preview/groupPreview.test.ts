import { describe, expect, it } from "vitest";

import { createEmptyGroup, createEmptyProject } from "../project/defaults";
import { findNextReadyGroupId, projectGroupsForPreview } from "./groupPreview";

describe("temporary group preview", () => {
  it("places the selected ready group above published groups without changing project order", () => {
    const project = createEmptyProject("preview-test");
    const published = { ...createEmptyGroup("published"), publicationStatus: "published" as const };
    const ready = { ...createEmptyGroup("ready"), publicationStatus: "ready" as const };
    const later = createEmptyGroup("later");
    project.groups = [published, ready, later];

    const preview = projectGroupsForPreview(project, ready.id);

    expect(preview.map((group) => group.id)).toEqual(["ready", "published", "later"]);
    expect(project.groups.map((group) => group.id)).toEqual(["published", "ready", "later"]);
  });

  it("chooses the first ready group and ignores invalid preview requests", () => {
    const project = createEmptyProject("preview-ready-test");
    project.groups = [
      createEmptyGroup("not-ready"),
      { ...createEmptyGroup("ready"), publicationStatus: "ready" },
      { ...createEmptyGroup("later-ready"), publicationStatus: "ready" }
    ];

    expect(findNextReadyGroupId(project)).toBe("ready");
    expect(projectGroupsForPreview(project, "missing").map((group) => group.id)).toEqual([
      "not-ready",
      "ready",
      "later-ready"
    ]);
  });
});
