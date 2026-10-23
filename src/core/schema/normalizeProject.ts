import type { GroupEntry, ProjectData, PublicationStatus } from "../project/types";

function normalizePublicationStatus(status: string): PublicationStatus {
  const lowered = status.trim().toLowerCase();

  if (lowered === "ready") {
    return "ready";
  }

  if (lowered === "published") {
    return "published";
  }

  return "not ready";
}

export function normalizeProject(project: ProjectData): ProjectData {
  return {
    ...project,
    dictionary: Object.fromEntries(
      Object.entries(project.dictionary).map(([key, hashtags]) => [
        key,
        Array.from(new Set(hashtags))
      ])
    ),
    groups: project.groups.map((group: GroupEntry) => ({
      ...group,
      publicationStatus: normalizePublicationStatus(group.publicationStatus),
      posts: group.posts.map((post) => ({
        ...post,
        hashtags: Array.from(new Set(post.hashtags))
      })) as GroupEntry["posts"]
    }))
  };
}
