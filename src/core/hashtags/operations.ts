import type { HashtagDictionary } from "./generateHashtags";
import type { ProjectData } from "../project/types";

export type ProjectContentResult =
  | { ok: true; project: ProjectData }
  | { ok: false; error: string };

export function saveDictionaryRule(
  dictionary: HashtagDictionary,
  previousIdentifier: string | null,
  identifier: string,
  hashtagValues: string[]
): { ok: true; dictionary: HashtagDictionary } | { ok: false; error: string } {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (normalizedIdentifier.length === 0) {
    return { ok: false, error: "Enter an identifier." };
  }
  if (/[,\s]/.test(normalizedIdentifier)) {
    return {
      ok: false,
      error: "Identifiers cannot contain commas or spaces."
    };
  }

  const collision = Object.keys(dictionary).some(
    (key) =>
      key !== previousIdentifier &&
      key.trim().toLowerCase() === normalizedIdentifier
  );
  if (collision) {
    return { ok: false, error: `The identifier "${normalizedIdentifier}" already exists.` };
  }

  const hashtags = uniqueHashtags(hashtagValues);
  if (hashtags.length === 0) {
    return { ok: false, error: "Enter at least one hashtag for this identifier." };
  }

  const next = { ...dictionary };
  if (previousIdentifier !== null) {
    if (!(previousIdentifier in next)) {
      return { ok: false, error: "The dictionary rule no longer exists." };
    }
    delete next[previousIdentifier];
  }
  next[normalizedIdentifier] = hashtags;

  return { ok: true, dictionary: next };
}

export function deleteDictionaryRule(
  dictionary: HashtagDictionary,
  identifier: string
): { ok: true; dictionary: HashtagDictionary } | { ok: false; error: string } {
  if (!(identifier in dictionary)) {
    return { ok: false, error: "The dictionary rule no longer exists." };
  }

  const next = { ...dictionary };
  delete next[identifier];
  return { ok: true, dictionary: next };
}

export function setDefaultHashtagLimit(
  project: ProjectData,
  limit: number
): ProjectContentResult {
  if (!Number.isInteger(limit) || limit < 0) {
    return { ok: false, error: "The default hashtag limit must be a non-negative integer." };
  }

  return {
    ok: true,
    project: {
      ...project,
      settings: { ...project.settings, defaultHashtagLimit: limit }
    }
  };
}

export function updatePostContent(
  project: ProjectData,
  groupId: string,
  postIndex: number,
  description: string,
  hashtags: string[]
): ProjectContentResult {
  const groupIndex = project.groups.findIndex((group) => group.id === groupId);
  if (groupIndex < 0 || !isPostIndex(postIndex)) {
    return { ok: false, error: "The selected post no longer exists." };
  }

  const group = project.groups[groupIndex];
  if (group.publicationStatus === "published") {
    return { ok: false, error: "Published groups are locked." };
  }

  const posts = [...group.posts] as typeof group.posts;
  posts[postIndex] = {
    ...posts[postIndex],
    description,
    hashtags: uniqueHashtags(hashtags)
  };
  const groups = [...project.groups];
  groups[groupIndex] = { ...group, posts };

  return { ok: true, project: { ...project, groups } };
}

export function updatePostHashtagLimit(
  project: ProjectData,
  groupId: string,
  postIndex: number,
  limit: number | null
): ProjectContentResult {
  const groupIndex = project.groups.findIndex((group) => group.id === groupId);
  if (groupIndex < 0 || !isPostIndex(postIndex)) {
    return { ok: false, error: "The selected post no longer exists." };
  }
  if (limit !== null && (!Number.isInteger(limit) || limit < 0)) {
    return { ok: false, error: "The hashtag limit override must be empty or a non-negative integer." };
  }

  const group = project.groups[groupIndex];
  if (group.publicationStatus === "published") {
    return { ok: false, error: "Published groups are locked." };
  }

  const posts = [...group.posts] as typeof group.posts;
  posts[postIndex] = { ...posts[postIndex], hashtagLimitOverride: limit };
  const groups = [...project.groups];
  groups[groupIndex] = { ...group, posts };

  return { ok: true, project: { ...project, groups } };
}

export function updateUnassignedImageDescriptions(
  project: ProjectData,
  filenames: string[],
  description: string
): ProjectContentResult {
  const selectedFilenames = new Set(filenames);
  if (selectedFilenames.size === 0) {
    return { ok: false, error: "Select at least one unassigned image." };
  }

  const assignedFilenames = new Set(
    project.groups.flatMap((group) => group.posts.flatMap((post) => post.images))
  );
  const knownFilenames = new Set(project.images.map((image) => image.filename));
  const invalidFilename = Array.from(selectedFilenames).find(
    (filename) => !knownFilenames.has(filename) || assignedFilenames.has(filename)
  );
  if (invalidFilename) {
    return {
      ok: false,
      error: `"${invalidFilename}" is no longer an unassigned project image.`
    };
  }

  return {
    ok: true,
    project: {
      ...project,
      images: project.images.map((image) =>
        selectedFilenames.has(image.filename) ? { ...image, description } : image
      )
    }
  };
}

function uniqueHashtags(values: string[]): string[] {
  const seen = new Set<string>();
  const hashtags: string[] = [];

  for (const value of values) {
    const hashtag = value.trim();
    const normalized = hashtag.toLowerCase();
    if (hashtag.length === 0 || seen.has(normalized)) {
      continue;
    }
    hashtags.push(hashtag);
    seen.add(normalized);
  }

  return hashtags;
}

function isPostIndex(index: number): index is 0 | 1 | 2 {
  return Number.isInteger(index) && index >= 0 && index < 3;
}
