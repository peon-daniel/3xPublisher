import { describe, expect, it } from "vitest";

import { importProject } from "./importProject";

const validProjectJson = JSON.stringify({
  schemaVersion: 1,
  project: {
    id: "project-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  settings: {
    defaultHashtagLimit: 4
  },
  dictionary: {
    fd: ["#konicac35fd", "#konicaautos3", "#konicaautos3"]
  },
  images: [
    {
      filename: "P123_eye3.jpg",
      hidden: false,
      unassignedOrder: null,
      description: ""
    }
  ],
  groups: [
    {
      id: "group-1",
      publicationStatus: "ready",
      publishedAt: null,
      posts: [
        {
          id: "post-1",
          images: ["P123_eye3.jpg"],
          description: ".",
          hashtags: ["#one", "#one", "#two"],
          hashtagLimitOverride: null
        },
        {
          id: "post-2",
          images: ["P456_eye3.jpg"],
          description: ".",
          hashtags: [],
          hashtagLimitOverride: null
        },
        {
          id: "post-3",
          images: ["P789_eye3.jpg"],
          description: ".",
          hashtags: [],
          hashtagLimitOverride: null
        }
      ]
    }
  ]
});

describe("importProject", () => {
  it("returns a parse error for invalid JSON", () => {
    const result = importProject("{bad-json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("Invalid JSON");
    }
  });

  it("returns a validation error for unsupported schema version", () => {
    const invalidVersion = JSON.stringify({
      ...JSON.parse(validProjectJson),
      schemaVersion: 2
    });

    const result = importProject(invalidVersion);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Unsupported or missing schemaVersion. Expected schemaVersion = 1.");
    }
  });

  it("returns a validation error when group has not exactly three posts", () => {
    const invalidGroupPosts = JSON.stringify({
      ...JSON.parse(validProjectJson),
      groups: [
        {
          ...JSON.parse(validProjectJson).groups[0],
          posts: [
            JSON.parse(validProjectJson).groups[0].posts[0],
            JSON.parse(validProjectJson).groups[0].posts[1]
          ]
        }
      ]
    });

    const result = importProject(invalidGroupPosts);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("exactly three posts");
    }
  });

  it("normalizes and imports a valid project", () => {
    const result = importProject(validProjectJson);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(1);
      expect(result.project.groups[0].publicationStatus).toBe("ready");
      expect(result.project.groups[0].posts[0].hashtags).toEqual(["#one", "#two"]);
      expect(result.project.dictionary.fd).toEqual(["#konicac35fd", "#konicaautos3"]);
    }
  });
});
