import type { ProjectData } from "../project/types";

export function serializeProject(project: ProjectData): string {
  const output: ProjectData = {
    schemaVersion: project.schemaVersion,
    project: {
      id: project.project.id,
      createdAt: project.project.createdAt,
      updatedAt: project.project.updatedAt
    },
    settings: {
      defaultHashtagLimit: project.settings.defaultHashtagLimit
    },
    dictionary: Object.fromEntries(
      Object.entries(project.dictionary).map(([key, hashtags]) => [key, [...hashtags]])
    ),
    images: project.images.map((image) => ({
      filename: image.filename,
      hidden: image.hidden,
      unassignedOrder: image.unassignedOrder,
      description: image.description
    })),
    groups: project.groups.map((group) => ({
      id: group.id,
      publicationStatus: group.publicationStatus,
      publishedAt: group.publishedAt,
      posts: group.posts.map((post) => ({
        id: post.id,
        images: [...post.images],
        description: post.description,
        hashtags: [...post.hashtags],
        hashtagLimitOverride: post.hashtagLimitOverride
      })) as ProjectData["groups"][number]["posts"]
    }))
  };

  return `${JSON.stringify(output, null, 2)}\n`;
}
