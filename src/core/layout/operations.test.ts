import { describe, expect, it } from "vitest";

import { createEmptyGroup, createEmptyPost, createEmptyProject } from "../project/defaults";
import type { GroupEntry, PostEntry, ProjectData } from "../project/types";
import {
  assignImageToPost,
  deleteGroup,
  insertGroup,
  moveCarouselImage,
  moveGroup,
  movePostToEmptySlot,
  movePostWithinGroup,
  PLACEHOLDER_GROUP_ID,
  removeImageFromPost,
  setImageHidden
} from "./operations";

function makeProject(groups: GroupEntry[] = []): ProjectData {
  const project = createEmptyProject("layout-test");
  project.images = [
    { filename: "one.jpg", hidden: false, unassignedOrder: null, description: "" },
    { filename: "two.jpg", hidden: false, unassignedOrder: null, description: "" },
    { filename: "three.jpg", hidden: false, unassignedOrder: null, description: "" }
  ];
  project.groups = groups;
  return project;
}

function post(postId: string, images: string[] = [], description = "."): PostEntry {
  return {
    ...createEmptyPost(postId),
    images,
    description
  };
}

function group(
  groupId: string,
  posts: [PostEntry, PostEntry, PostEntry] = [
    post(`${groupId}-p1`),
    post(`${groupId}-p2`),
    post(`${groupId}-p3`)
  ],
  published = false
): GroupEntry {
  return {
    ...createEmptyGroup(groupId),
    posts,
    publicationStatus: published ? "published" : "not ready",
    publishedAt: published ? "2026-01-01T00:00:00.000Z" : null
  };
}

describe("layout operations", () => {
  it("commits the UI placeholder only when an image is assigned", () => {
    const result = assignImageToPost(
      makeProject(),
      "one.jpg",
      PLACEHOLDER_GROUP_ID,
      0
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups).toHaveLength(1);
      expect(result.project.groups[0].posts).toHaveLength(3);
      expect(result.project.groups[0].posts[0].images).toEqual(["one.jpg"]);
      expect(result.project.groups[0].publicationStatus).toBe("not ready");
    }
  });

  it("moves a post into the placeholder by committing a new three-slot group", () => {
    const project = makeProject([
      group("source", [post("moving", ["one.jpg"]), post("s2"), post("s3")])
    ]);
    const result = movePostToEmptySlot(
      project,
      "source",
      0,
      PLACEHOLDER_GROUP_ID,
      1
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups).toHaveLength(2);
      expect(result.project.groups[0].posts[0].images).toEqual([]);
      expect(result.project.groups[1].posts).toHaveLength(3);
      expect(result.project.groups[1].posts[1]).toMatchObject({
        id: "moving",
        images: ["one.jpg"]
      });
    }
  });

  it("does not commit the placeholder when assignment is invalid", () => {
    const result = assignImageToPost(makeProject(), "not-in-catalog.jpg", PLACEHOLDER_GROUP_ID, 0);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid-operation"
    });
  });

  it("prevents one image from being assigned to multiple posts", () => {
    const original = makeProject([group("g1", [post("p1", ["one.jpg"]), post("p2"), post("p3")])]);
    const result = assignImageToPost(original, "one.jpg", "g1", 1);

    expect(result).toMatchObject({ ok: false, error: "This image is already assigned to a post." });
    expect(original.groups[0].posts[1].images).toEqual([]);
  });

  it("prevents assignment to published groups", () => {
    const result = assignImageToPost(
      makeProject([group("published", undefined, true)]),
      "one.jpg",
      "published",
      0
    );

    expect(result).toMatchObject({ ok: false, error: "Published groups are locked." });
  });

  it("removes an image from its post so it becomes unassigned", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg", "two.jpg"]), post("p2"), post("p3")])
    ]);
    const result = removeImageFromPost(project, "g1", 0, 0);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].posts[0].images).toEqual(["two.jpg"]);
      expect(result.project.images.map((image) => image.filename)).toContain("one.jpg");
    }
  });

  it("persists hidden state without deleting the catalog entry", () => {
    const project = makeProject();
    const result = setImageHidden(project, "one.jpg", true);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.images[0]).toMatchObject({
        filename: "one.jpg",
        hidden: true
      });
    }
  });

  it("reorders carousel images without changing saved captions", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg", "two.jpg"], "caption"), post("p2"), post("p3")])
    ]);
    const result = moveCarouselImage(project, "g1", 0, 0, 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].posts[0]).toMatchObject({
        images: ["two.jpg", "one.jpg"],
        description: "caption"
      });
    }
  });

  it("does not allow carousel movement beyond its bounds", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg"]), post("p2"), post("p3")])
    ]);

    expect(moveCarouselImage(project, "g1", 0, 0, -1)).toMatchObject({
      ok: false,
      reason: "invalid-operation"
    });
  });

  it("moves groups only among unpublished groups below the published block", () => {
    const original = makeProject([
      group("pub", undefined, true),
      group("first"),
      group("second")
    ]);
    const moved = moveGroup(original, "first", 1);

    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.project.groups.map((item) => item.id)).toEqual(["pub", "second", "first"]);
    }
    expect(moveGroup(original, "first", -1)).toMatchObject({ ok: false });
    expect(moveGroup(original, "pub", 1)).toMatchObject({ ok: false });
  });

  it("rejects group ordering when published groups are not at the top", () => {
    const project = makeProject([group("unpublished"), group("published", undefined, true)]);

    expect(moveGroup(project, "unpublished", 1)).toMatchObject({ ok: false });
    expect(insertGroup(project, 1)).toMatchObject({ ok: false });
  });

  it("reorders posts only within their group", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg"]), post("p2", ["two.jpg"]), post("p3")])
    ]);
    const result = movePostWithinGroup(project, "g1", 0, 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].posts.map((item) => item.id)).toEqual(["p2", "p1", "p3"]);
    }
    expect(movePostWithinGroup(project, "g1", 0, -1)).toMatchObject({ ok: false });
  });

  it("recomputes readiness when an assignment fills the final post slot", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg"]), post("p2", ["two.jpg"]), post("p3")])
    ]);
    const result = assignImageToPost(project, "three.jpg", "g1", 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].publicationStatus).toBe("ready");
    }
  });

  it("moves a populated post only into an empty slot in another group", () => {
    const project = makeProject([
      group("source", [post("moving", ["one.jpg"], "saved"), post("s2"), post("s3")]),
      group("target")
    ]);
    const result = movePostToEmptySlot(project, "source", 0, "target", 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups[0].posts[0]).toMatchObject({ id: "target-p3", images: [] });
      expect(result.project.groups[1].posts[2]).toMatchObject({
        id: "moving",
        images: ["one.jpg"],
        description: "saved"
      });
    }
  });

  it("does not overwrite occupied cross-group destinations", () => {
    const project = makeProject([
      group("source", [post("moving", ["one.jpg"]), post("s2"), post("s3")]),
      group("target", [post("t1", ["two.jpg"]), post("t2"), post("t3")])
    ]);
    const result = movePostToEmptySlot(project, "source", 0, "target", 0);

    expect(result).toMatchObject({ ok: false, error: "Posts can only move to an empty destination slot." });
    expect(project.groups[1].posts[0].images).toEqual(["two.jpg"]);
  });

  it("inserts new groups only below published groups", () => {
    const project = makeProject([group("pub", undefined, true), group("unpublished")]);
    const inserted = group("new");

    const result = insertGroup(project, 1, inserted);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups.map((item) => item.id)).toEqual(["pub", "new", "unpublished"]);
    }
    expect(insertGroup(project, 0, inserted)).toMatchObject({ ok: false });
  });

  it("requires confirmation to delete populated groups and keeps catalog images", () => {
    const project = makeProject([
      group("g1", [post("p1", ["one.jpg"]), post("p2"), post("p3")])
    ]);
    expect(deleteGroup(project, "g1")).toMatchObject({
      ok: false,
      reason: "confirmation-required"
    });

    const result = deleteGroup(project, "g1", true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups).toEqual([]);
      expect(result.project.images.map((image) => image.filename)).toContain("one.jpg");
    }
  });

  it("requires confirmation when only a description makes a group populated", () => {
    const project = makeProject([
      group("g1", [post("p1", [], "caption"), post("p2"), post("p3")])
    ]);

    expect(deleteGroup(project, "g1")).toMatchObject({ reason: "confirmation-required" });
  });

  it("deletes an empty group without confirmation and locks published groups", () => {
    const project = makeProject([group("empty"), group("pub", undefined, true)]);

    const result = deleteGroup(project, "empty");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.groups.map((item) => item.id)).toEqual(["pub"]);
    }
    expect(deleteGroup(project, "pub", true)).toMatchObject({ ok: false });
  });
});
