import { describe, expect, it } from "vitest";

import { createEmptyGroup, createEmptyPost, createEmptyProject } from "../project/defaults";
import type { GroupEntry, ImageEntry, ProjectData } from "../project/types";
import {
  applyImagePathResolutions,
  reconcileProjectImages
} from "./reconcileProjectImages";

const discovered = (...filenames: string[]) =>
  filenames.map((filename) => ({ filename, relativePath: filename }));

function makeProject(groups: GroupEntry[] = [], images: ImageEntry[] = []): ProjectData {
  return {
    ...createEmptyProject("project-test"),
    images,
    groups
  };
}

function makeGroup(posts: [ReturnType<typeof createEmptyPost>, ReturnType<typeof createEmptyPost>, ReturnType<typeof createEmptyPost>], published = false): GroupEntry {
  return {
    ...createEmptyGroup("group-test"),
    publicationStatus: published ? "published" : "ready",
    publishedAt: published ? "2026-01-02T03:04:05.000Z" : null,
    posts
  };
}

function makePost(postId: string, filenames: string[], description = "caption"): ReturnType<typeof createEmptyPost> {
  return {
    ...createEmptyPost(postId),
    images: filenames,
    description,
    hashtags: ["#saved"]
  };
}

describe("reconcileProjectImages", () => {
  it("applies an explicit filename-to-path choice only when the chosen path is present", () => {
    const files = [
      { filename: "same.jpg", relativePath: "a/same.jpg" },
      { filename: "same.jpg", relativePath: "b/same.jpg" },
      { filename: "other.jpg", relativePath: "other.jpg" }
    ];

    expect(
      applyImagePathResolutions(files, new Map([["same.jpg", "b/same.jpg"]]))
    ).toEqual([files[1], files[2]]);
    expect(
      applyImagePathResolutions(files, new Map([["same.jpg", "missing/same.jpg"]]))
    ).toEqual(files);
  });

  it("adds new images as visible unassigned entries", () => {
    const result = reconcileProjectImages(makeProject(), discovered("new.jpg"), {
      sourceComplete: true
    });

    expect(result.changed).toBe(true);
    expect(result.addedFilenames).toEqual(["new.jpg"]);
    expect(result.project.images).toEqual([
      {
        filename: "new.jpg",
        hidden: false,
        unassignedOrder: null,
        description: ""
      }
    ]);
  });

  it("preserves metadata for present images and removes disappeared unassigned images", () => {
    const existing = {
      filename: "saved.jpg",
      hidden: true,
      unassignedOrder: 3,
      description: "saved note"
    };
    const result = reconcileProjectImages(
      makeProject([], [existing, { ...existing, filename: "gone.jpg" }]),
      discovered("saved.jpg"),
      { sourceComplete: true }
    );

    expect(result.project.images).toEqual([existing]);
    expect(result.removedFilenames).toEqual(["gone.jpg"]);
  });

  it("removes a missing carousel item and retains its saved caption", () => {
    const post = makePost("post-1", ["missing.jpg", "remaining.jpg"]);
    const group = makeGroup([post, createEmptyPost("post-2"), createEmptyPost("post-3")]);
    const result = reconcileProjectImages(makeProject([group]), discovered("remaining.jpg"), {
      sourceComplete: true
    });

    expect(result.project.groups[0].posts[0]).toMatchObject({
      images: ["remaining.jpg"],
      description: "caption",
      hashtags: ["#saved"]
    });
    expect(result.project.groups[0].publicationStatus).toBe("not ready");
  });

  it("makes the next carousel image the lead without regenerating hashtags", () => {
    const post = makePost("post-1", ["missing-lead.jpg", "new-lead.jpg", "third.jpg"]);
    const group = makeGroup([post, createEmptyPost("post-2"), createEmptyPost("post-3")]);
    const result = reconcileProjectImages(
      makeProject([group]),
      discovered("new-lead.jpg", "third.jpg"),
      { sourceComplete: true }
    );

    expect(result.project.groups[0].posts[0].images).toEqual(["new-lead.jpg", "third.jpg"]);
    expect(result.project.groups[0].posts[0].hashtags).toEqual(["#saved"]);
    expect(result.project.groups[0].posts[0].description).toBe("caption");
  });

  it("clears caption and hashtags when the last unpublished post image disappears", () => {
    const post = makePost("post-1", ["missing.jpg"]);
    const group = makeGroup([post, createEmptyPost("post-2"), createEmptyPost("post-3")]);
    const result = reconcileProjectImages(makeProject([group]), [], { sourceComplete: true });

    expect(result.project.groups[0].posts[0]).toMatchObject({
      images: [],
      description: "",
      hashtags: []
    });
    expect(result.project.groups[0].publicationStatus).toBe("not ready");
    expect(result.missingAssignments).toEqual([
      {
        filename: "missing.jpg",
        groupId: "group-test",
        postId: "post-1",
        published: false
      }
    ]);
  });

  it("preserves published group status, timestamp, and caption when its last image disappears", () => {
    const post = makePost("post-1", ["missing.jpg"]);
    const group = makeGroup([post, createEmptyPost("post-2"), createEmptyPost("post-3")], true);
    const result = reconcileProjectImages(makeProject([group]), [], { sourceComplete: true });

    const reconciledGroup = result.project.groups[0];
    expect(reconciledGroup.publicationStatus).toBe("published");
    expect(reconciledGroup.publishedAt).toBe("2026-01-02T03:04:05.000Z");
    expect(reconciledGroup.posts[0]).toMatchObject({
      images: [],
      description: "caption",
      hashtags: ["#saved"]
    });
    expect(result.missingAssignments[0].published).toBe(true);
  });

  it("reports duplicate filenames and preserves references to ambiguous files", () => {
    const post = makePost("post-1", ["duplicate.jpg"]);
    const group = makeGroup([post, createEmptyPost("post-2"), createEmptyPost("post-3")]);
    const result = reconcileProjectImages(
      makeProject([group]),
      [
        { filename: "duplicate.jpg", relativePath: "a/duplicate.jpg" },
        { filename: "duplicate.jpg", relativePath: "b/duplicate.jpg" },
        { filename: "unique.jpg", relativePath: "unique.jpg" }
      ],
      { sourceComplete: true }
    );

    expect(result.ambiguities).toEqual([
      {
        filename: "duplicate.jpg",
        relativePaths: ["a/duplicate.jpg", "b/duplicate.jpg"]
      }
    ]);
    expect(result.project.groups[0].posts[0].images).toEqual(["duplicate.jpg"]);
    expect(result.project.images.map((image) => image.filename)).toEqual(["unique.jpg"]);
    expect(result.removedFilenames).toEqual([]);
  });

  it("does not mutate the source project", () => {
    const project = makeProject([], [
      {
        filename: "gone.jpg",
        hidden: false,
        unassignedOrder: null,
        description: ""
      }
    ]);
    const originalImages = structuredClone(project.images);

    reconcileProjectImages(project, [], { sourceComplete: true });

    expect(project.images).toEqual(originalImages);
  });

  it("returns the original project when there are no changes", () => {
    const project = makeProject([], [
      {
        filename: "present.jpg",
        hidden: false,
        unassignedOrder: null,
        description: ""
      }
    ]);

    const result = reconcileProjectImages(project, discovered("present.jpg"), {
      sourceComplete: true
    });

    expect(result.changed).toBe(false);
    expect(result.project).toBe(project);
  });

  it("does not mark unselected files missing when discovery is partial", () => {
    const project = makeProject([], [
      {
        filename: "not-selected.jpg",
        hidden: false,
        unassignedOrder: null,
        description: ""
      }
    ]);

    const result = reconcileProjectImages(project, discovered("new.jpg"), {
      sourceComplete: false
    });

    expect(result.removedFilenames).toEqual([]);
    expect(result.project.images.map((image) => image.filename)).toEqual([
      "not-selected.jpg",
      "new.jpg"
    ]);
  });
});
