import { describe, expect, it } from "vitest";

import { createEmptyGroup, createEmptyProject } from "../project/defaults";
import {
  deleteDictionaryRule,
  saveDictionaryRule,
  setDefaultHashtagLimit,
  updatePostContent,
  updatePostHashtagLimit,
  updateUnassignedImageDescriptions
} from "./operations";
import { formatCaption } from "./caption";

function projectWithPost() {
  const project = createEmptyProject("content-test");
  project.images = [
    { filename: "P1_d3.jpg", hidden: false, unassignedOrder: null, description: "" },
    { filename: "P2_fp100.jpg", hidden: false, unassignedOrder: null, description: "" }
  ];
  project.dictionary = { d3: ["#film", "#developer"] };
  project.groups = [createEmptyGroup("group")];
  return project;
}

describe("hashtag and caption operations", () => {
  it("normalizes dictionary identifiers and deduplicates values", () => {
    const result = saveDictionaryRule({}, null, " D3 ", [" #film ", "#FILM", "#developer"]);

    expect(result).toEqual({
      ok: true,
      dictionary: { d3: ["#film", "#developer"] }
    });
  });

  it("allows compound identifiers and rejects spaces or duplicate case-insensitive identifiers", () => {
    expect(saveDictionaryRule({}, null, "black_and_white", ["#tag"])).toMatchObject({
      ok: true
    });
    expect(saveDictionaryRule({}, null, "half frame", ["#tag"])).toMatchObject({
      ok: false
    });
    expect(
      saveDictionaryRule({ D3: ["#old"] }, null, "d3", ["#new"])
    ).toMatchObject({ ok: false });
  });

  it("renames and deletes dictionary rules without changing project hashtags", () => {
    const project = projectWithPost();
    project.groups[0].posts[0].hashtags = ["#saved"];
    const renamed = saveDictionaryRule(project.dictionary, "d3", "camera", ["#camera"]);

    expect(renamed).toMatchObject({ ok: true, dictionary: { camera: ["#camera"] } });
    expect(project.groups[0].posts[0].hashtags).toEqual(["#saved"]);
    expect(deleteDictionaryRule(project.dictionary, "d3")).toMatchObject({
      ok: true,
      dictionary: {}
    });
  });

  it("updates post text without changing readiness or other project content", () => {
    const project = projectWithPost();
    const result = updatePostContent(project, "group", 1, "Caption", ["#a", "#A", ""]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].publicationStatus).toBe("not ready");
      expect(result.project.groups[0].posts[1]).toMatchObject({
        description: "Caption",
        hashtags: ["#a"]
      });
      expect(project.groups[0].posts[1].description).toBe(".");
    }
  });

  it("validates default and per-post hashtag limits", () => {
    const project = projectWithPost();
    project.groups[0].posts[0].hashtagLimitOverride = 7;

    const defaultLimitResult = setDefaultHashtagLimit(project, 0);
    expect(defaultLimitResult.ok).toBe(true);
    if (defaultLimitResult.ok) {
      expect(defaultLimitResult.project.settings.defaultHashtagLimit).toBe(0);
      expect(defaultLimitResult.project.groups[0].posts[0].hashtagLimitOverride).toBe(7);
    }
    expect(setDefaultHashtagLimit(project, -1)).toMatchObject({ ok: false });
    expect(updatePostHashtagLimit(project, "group", 0, 7).ok).toBe(true);
    expect(updatePostHashtagLimit(project, "group", 0, -1)).toMatchObject({ ok: false });
    expect(updatePostHashtagLimit(project, "group", 0, null).ok).toBe(true);
  });

  it("applies descriptions only to selected unassigned images", () => {
    const project = projectWithPost();
    const result = updateUnassignedImageDescriptions(project, ["P1_d3.jpg"], "Shared text");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.images.map((image) => image.description)).toEqual([
        "Shared text",
        ""
      ]);
    }
    expect(updateUnassignedImageDescriptions(project, [], "Text")).toMatchObject({
      ok: false
    });
  });

  it("formats a saved caption without inventing hashtags", () => {
    expect(formatCaption(" ", [])).toBe(".\n\n");
    expect(formatCaption("Description", ["#one", "#two"])).toBe(
      "Description\n\n#one #two"
    );
  });
});
