import {
  DEFAULT_HASHTAG_LIMIT,
  type GroupEntry,
  type PostEntry,
  SCHEMA_VERSION,
  type ProjectData
} from "./types";

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTimestamp(): string {
  return new Date().toISOString();
}

export function createEmptyPost(postId: string = createId()): PostEntry {
  return {
    id: postId,
    images: [],
    description: ".",
    hashtags: [],
    hashtagLimitOverride: null
  };
}

export function createEmptyGroup(groupId: string = createId()): GroupEntry {
  return {
    id: groupId,
    publicationStatus: "not ready",
    publishedAt: null,
    posts: [createEmptyPost(), createEmptyPost(), createEmptyPost()]
  };
}

export function createEmptyProject(projectId: string = createId()): ProjectData {
  const timestamp = createTimestamp();

  return {
    schemaVersion: SCHEMA_VERSION,
    project: {
      id: projectId,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    settings: {
      defaultHashtagLimit: DEFAULT_HASHTAG_LIMIT
    },
    dictionary: {},
    images: [],
    groups: []
  };
}
