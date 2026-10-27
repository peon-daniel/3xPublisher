import type { GroupEntry, ImageEntry, PostEntry, ProjectData } from "../project/types";
import type { DiscoveredImage } from "./discoverImages";

export interface MissingImageAssignment {
  filename: string;
  groupId: string;
  postId: string;
  published: boolean;
}

export interface AmbiguousImageFilename {
  filename: string;
  relativePaths: string[];
}

export interface ImageReconciliationResult {
  project: ProjectData;
  addedFilenames: string[];
  removedFilenames: string[];
  missingAssignments: MissingImageAssignment[];
  ambiguities: AmbiguousImageFilename[];
  changed: boolean;
}

export function applyImagePathResolutions(
  discoveredImages: DiscoveredImage[],
  resolutions: ReadonlyMap<string, string>
): DiscoveredImage[] {
  const resolvedPaths = new Map<string, DiscoveredImage>();

  for (const [filename, relativePath] of resolutions) {
    const match = discoveredImages.find(
      (image) => image.filename === filename && image.relativePath === relativePath
    );
    if (match) {
      resolvedPaths.set(filename, match);
    }
  }

  return discoveredImages.filter((image) => {
    const resolved = resolvedPaths.get(image.filename);
    return resolved === undefined || resolved.relativePath === image.relativePath;
  });
}

export function reconcileProjectImages(
  project: ProjectData,
  discoveredImages: Iterable<DiscoveredImage>,
  options: { sourceComplete: boolean }
): ImageReconciliationResult {
  const filesByFilename = new Map<string, DiscoveredImage[]>();

  for (const image of discoveredImages) {
    const files = filesByFilename.get(image.filename) ?? [];
    files.push(image);
    filesByFilename.set(image.filename, files);
  }

  const ambiguities: AmbiguousImageFilename[] = [];
  const ambiguousFilenames = new Set<string>();

  for (const [filename, files] of filesByFilename) {
    if (files.length > 1) {
      ambiguousFilenames.add(filename);
      ambiguities.push({
        filename,
        relativePaths: files.map((file) => file.relativePath)
      });
    }
  }

  const availableFilenames = new Set(
    Array.from(filesByFilename.keys()).filter((filename) => !ambiguousFilenames.has(filename))
  );
  const referencedFilenames = new Set(project.images.map((image) => image.filename));

  for (const group of project.groups) {
    for (const post of group.posts) {
      for (const filename of post.images) {
        referencedFilenames.add(filename);
      }
    }
  }

  const removedFilenames = options.sourceComplete
    ? Array.from(referencedFilenames).filter(
        (filename) => !availableFilenames.has(filename) && !ambiguousFilenames.has(filename)
      )
    : [];
  const missingFilenames = new Set(removedFilenames);
  const missingAssignments: MissingImageAssignment[] = [];
  const addedFilenames: string[] = [];
  const existingImageEntries = new Map(project.images.map((image) => [image.filename, image]));

  for (const filename of availableFilenames) {
    if (!existingImageEntries.has(filename)) {
      addedFilenames.push(filename);
    }
  }

  const images: ImageEntry[] = [
    ...project.images
      .filter((image) => !missingFilenames.has(image.filename))
      .map((image) => ({ ...image })),
    ...addedFilenames.map(createUnassignedImageEntry)
  ];

  const groups = project.groups.map((group) =>
    reconcileGroup(group, missingFilenames, missingAssignments)
  );
  const changed =
    addedFilenames.length > 0 ||
    removedFilenames.length > 0 ||
    groups.some((group, index) => !groupsEqual(group, project.groups[index]));

  return {
    project: changed ? { ...project, images, groups } : project,
    addedFilenames,
    removedFilenames,
    missingAssignments,
    ambiguities,
    changed
  };
}

function createUnassignedImageEntry(filename: string): ImageEntry {
  return {
    filename,
    hidden: false,
    unassignedOrder: null,
    description: ""
  };
}

function reconcileGroup(
  group: GroupEntry,
  missingFilenames: Set<string>,
  missingAssignments: MissingImageAssignment[]
): GroupEntry {
  let groupChanged = false;
  const isPublished = group.publicationStatus === "published";

  const posts = group.posts.map((post) => {
    const remainingImages = post.images.filter((filename) => {
      if (!missingFilenames.has(filename)) {
        return true;
      }

      missingAssignments.push({
        filename,
        groupId: group.id,
        postId: post.id,
        published: isPublished
      });
      return false;
    });

    if (remainingImages.length === post.images.length) {
      return post;
    }

    groupChanged = true;
    if (remainingImages.length > 0 || isPublished) {
      return {
        ...post,
        images: remainingImages
      };
    }

    return {
      ...post,
      images: [],
      description: "",
      hashtags: []
    };
  }) as GroupEntry["posts"];

  if (!groupChanged || isPublished) {
    return groupChanged ? { ...group, posts } : group;
  }

  const publicationStatus = posts.every((post) => post.images.length > 0) ? "ready" : "not ready";
  if (publicationStatus !== group.publicationStatus) {
    groupChanged = true;
  }

  return groupChanged ? { ...group, publicationStatus, posts } : group;
}

function groupsEqual(left: GroupEntry, right: GroupEntry): boolean {
  if (left.publicationStatus !== right.publicationStatus) {
    return false;
  }

  return left.posts.every((post, index) => postsEqual(post, right.posts[index]));
}

function postsEqual(left: PostEntry, right: PostEntry): boolean {
  return (
    left.description === right.description &&
    left.hashtags.length === right.hashtags.length &&
    left.hashtags.every((hashtag, index) => hashtag === right.hashtags[index]) &&
    left.images.length === right.images.length &&
    left.images.every((filename, index) => filename === right.images[index])
  );
}
