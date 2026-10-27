import { createEmptyGroup, createEmptyPost } from "../project/defaults";
import type { GroupEntry, PostEntry, ProjectData } from "../project/types";
import {
  generateHashtags,
  generateHashtagsFromIdentifiers
} from "../hashtags/generateHashtags";
import { sortUnassignedImages } from "../images/sortUnassignedImages";

export const PLACEHOLDER_GROUP_ID = "__bottom_placeholder__";

export type LayoutOperationResult =
  | { ok: true; project: ProjectData }
  | {
      ok: false;
      reason: "invalid-operation" | "confirmation-required";
      error: string;
    };

export function assignImageToPost(
  project: ProjectData,
  filename: string,
  groupId: string,
  postIndex: number,
  identifierOverride?: string[]
): LayoutOperationResult {
  if (!project.images.some((image) => image.filename === filename)) {
    return failure("Image is not in the project catalog.");
  }
  if (getAssignedFilenames(project).has(filename)) {
    return failure("This image is already assigned to a post.");
  }
  if (!isPostIndex(postIndex)) {
    return failure("Post slot must be one of the three positions in its group.");
  }

  const isPlaceholder = groupId === PLACEHOLDER_GROUP_ID;
  const targetGroup = isPlaceholder
    ? undefined
    : project.groups.find((group) => group.id === groupId);

  if (!isPlaceholder && !targetGroup) {
    return failure("The selected post group no longer exists.");
  }
  if (targetGroup?.publicationStatus === "published") {
    return failure("Published groups are locked.");
  }

  const group = targetGroup ?? createEmptyGroup();
  const posts = [...group.posts] as GroupEntry["posts"];
  const post = posts[postIndex];
  posts[postIndex] = {
    ...post,
    images: [...post.images, filename],
    hashtags:
      post.images.length === 0 && post.hashtags.length === 0
      ? identifierOverride
        ? generateHashtagsFromIdentifiers(identifierOverride, project.dictionary)
        : generateHashtags(filename, project.dictionary)
        : post.hashtags
  };
  const updatedGroup = withReadiness({ ...group, posts });
  const groups = isPlaceholder
    ? [...project.groups, updatedGroup]
    : project.groups.map((candidate) =>
        candidate.id === groupId ? updatedGroup : candidate
      );

  const images = project.images.map((image) =>
    image.filename === filename ? { ...image, unassignedOrder: null } : image
  );
  return success({ ...project, groups, images });
}

export function assignImagesToPost(
  project: ProjectData,
  filenames: string[],
  groupId: string,
  postIndex: number,
  identifiersByFilename: ReadonlyMap<string, string[]> = new Map()
): LayoutOperationResult {
  if (filenames.length === 0 || new Set(filenames).size !== filenames.length) {
    return failure("Select one or more distinct unassigned images.");
  }

  let nextProject = project;
  let targetGroupId = groupId;
  for (const filename of filenames) {
    const result = assignImageToPost(
      nextProject,
      filename,
      targetGroupId,
      postIndex,
      identifiersByFilename.get(filename)
    );
    if (!result.ok) {
      return result;
    }

    nextProject = result.project;
    if (targetGroupId === PLACEHOLDER_GROUP_ID) {
      targetGroupId = nextProject.groups.at(-1)?.id ?? PLACEHOLDER_GROUP_ID;
    }
  }

  return success(nextProject);
}

export function moveUnassignedImageTo(
  project: ProjectData,
  sourceFilename: string,
  targetFilename: string,
  insertAfter: boolean,
  visibleFilenames?: string[]
): LayoutOperationResult {
  return moveUnassignedImagesTo(
    project,
    [sourceFilename],
    targetFilename,
    insertAfter,
    visibleFilenames
  );
}

export function moveUnassignedImagesTo(
  project: ProjectData,
  sourceFilenames: string[],
  targetFilename: string,
  insertAfter: boolean,
  visibleFilenames?: string[]
): LayoutOperationResult {
  const assignedFilenames = getAssignedFilenames(project);
  const allUnassigned = sortUnassignedImages(
    project.images.filter((image) => !assignedFilenames.has(image.filename))
  );
  const visibleSet = new Set(visibleFilenames ?? allUnassigned.map((image) => image.filename));
  const visible = allUnassigned.filter((image) => visibleSet.has(image.filename));
  const targetIndex = visible.findIndex((image) => image.filename === targetFilename);
  const sourceSet = new Set(sourceFilenames);
  if (
    sourceFilenames.length === 0 ||
    sourceSet.size !== sourceFilenames.length ||
    sourceFilenames.some((filename) => !visible.some((image) => image.filename === filename)) ||
    targetIndex < 0 ||
    sourceSet.has(targetFilename) ||
    (visibleFilenames ?? []).some((filename) => {
      const image = project.images.find((candidate) => candidate.filename === filename);
      return !image || assignedFilenames.has(filename);
    })
  ) {
    return failure("The selected unassigned images are no longer available.");
  }

  const movedImages = visible.filter((image) => sourceSet.has(image.filename));
  const remainingVisible = visible.filter((image) => !sourceSet.has(image.filename));
  const destinationIndex = remainingVisible.findIndex(
    (image) => image.filename === targetFilename
  );
  remainingVisible.splice(destinationIndex + (insertAfter ? 1 : 0), 0, ...movedImages);
  const visibleFilenamesSet = new Set(remainingVisible.map((image) => image.filename));
  let visibleIndex = 0;
  const reorderedUnassigned = allUnassigned.map((image) =>
    visibleFilenamesSet.has(image.filename) ? remainingVisible[visibleIndex++] : image
  );
  const orderByFilename = new Map(
    reorderedUnassigned.map((image, index) => [image.filename, index])
  );

  return success({
    ...project,
    images: project.images.map((image) => {
      const order = orderByFilename.get(image.filename);
      return order === undefined ? image : { ...image, unassignedOrder: order };
    })
  });
}

export function moveUnassignedImage(
  project: ProjectData,
  filename: string,
  direction: -1 | 1,
  visibleFilenames?: string[]
): LayoutOperationResult {
  const assignedFilenames = getAssignedFilenames(project);
  const unassigned = sortUnassignedImages(
    project.images.filter(
      (image) =>
        !assignedFilenames.has(image.filename) &&
        (visibleFilenames === undefined || visibleFilenames.includes(image.filename))
    )
  );
  const sourceIndex = unassigned.findIndex((image) => image.filename === filename);
  const target = unassigned[sourceIndex + direction];
  if (sourceIndex < 0 || !target) {
    return failure("The unassigned image cannot be moved any farther in that direction.");
  }

  return moveUnassignedImageTo(
    project,
    filename,
    target.filename,
    direction === 1,
    unassigned.map((image) => image.filename)
  );
}

export function setImageHidden(
  project: ProjectData,
  filename: string,
  hidden: boolean
): LayoutOperationResult {
  const imageIndex = project.images.findIndex((image) => image.filename === filename);
  if (imageIndex < 0) {
    return failure("The selected image is no longer in the project catalog.");
  }

  const images = [...project.images];
  images[imageIndex] = { ...images[imageIndex], hidden };
  return success({ ...project, images });
}

export function removeImageFromPost(
  project: ProjectData,
  groupId: string,
  postIndex: number,
  imageIndex: number
): LayoutOperationResult {
  const group = findEditableGroup(project, groupId);
  if (!group.ok) {
    return group;
  }
  if (!isPostIndex(postIndex) || !Number.isInteger(imageIndex) || imageIndex < 0) {
    return failure("The selected image position is invalid.");
  }

  const post = group.value.posts[postIndex];
  if (imageIndex >= post.images.length) {
    return failure("The selected image is no longer in this post.");
  }

  const posts = [...group.value.posts] as GroupEntry["posts"];
  posts[postIndex] = {
    ...post,
    images: post.images.filter((_, index) => index !== imageIndex)
  };

  return replaceGroup(project, withReadiness({ ...group.value, posts }));
}

export function moveCarouselImage(
  project: ProjectData,
  groupId: string,
  postIndex: number,
  imageIndex: number,
  direction: -1 | 1
): LayoutOperationResult {
  const group = findEditableGroup(project, groupId);
  if (!group.ok) {
    return group;
  }
  if (!isPostIndex(postIndex)) {
    return failure("The selected post position is invalid.");
  }

  const images = [...group.value.posts[postIndex].images];
  const targetIndex = imageIndex + direction;
  if (
    !Number.isInteger(imageIndex) ||
    imageIndex < 0 ||
    imageIndex >= images.length ||
    targetIndex < 0 ||
    targetIndex >= images.length
  ) {
    return failure("The image cannot be moved any farther in that direction.");
  }

  [images[imageIndex], images[targetIndex]] = [images[targetIndex], images[imageIndex]];
  const posts = [...group.value.posts] as GroupEntry["posts"];
  posts[postIndex] = { ...posts[postIndex], images };
  return replaceGroup(project, { ...group.value, posts });
}

export function moveGroup(
  project: ProjectData,
  groupId: string,
  direction: -1 | 1
): LayoutOperationResult {
  const groupIndex = project.groups.findIndex((group) => group.id === groupId);
  if (groupIndex < 0) {
    return failure("The selected group no longer exists.");
  }
  if (project.groups[groupIndex].publicationStatus === "published") {
    return failure("Published groups cannot be moved.");
  }

  const publishedCount = publishedBlockBoundary(project.groups);
  if (publishedCount === undefined) {
    return failure("Published groups must remain together at the top of the project.");
  }
  const targetIndex = groupIndex + direction;
  if (targetIndex < publishedCount || targetIndex >= project.groups.length) {
    return failure("Groups can only be moved within the unpublished section.");
  }

  const groups = [...project.groups];
  [groups[groupIndex], groups[targetIndex]] = [groups[targetIndex], groups[groupIndex]];
  return success({ ...project, groups });
}

export function movePostWithinGroup(
  project: ProjectData,
  groupId: string,
  postIndex: number,
  direction: -1 | 1
): LayoutOperationResult {
  const group = findEditableGroup(project, groupId);
  if (!group.ok) {
    return group;
  }
  if (!isPostIndex(postIndex)) {
    return failure("The selected post position is invalid.");
  }

  const targetIndex = postIndex + direction;
  if (!isPostIndex(targetIndex)) {
    return failure("Posts can only be reordered within their group.");
  }

  const posts = [...group.value.posts] as GroupEntry["posts"];
  [posts[postIndex], posts[targetIndex]] = [posts[targetIndex], posts[postIndex]];
  return replaceGroup(project, { ...group.value, posts });
}

export function movePostToEmptySlot(
  project: ProjectData,
  sourceGroupId: string,
  sourcePostIndex: number,
  targetGroupId: string,
  targetPostIndex: number
): LayoutOperationResult {
  if (sourceGroupId === targetGroupId) {
    return failure("Use within-group post reordering for posts in the same group.");
  }
  if (!isPostIndex(sourcePostIndex) || !isPostIndex(targetPostIndex)) {
    return failure("Post positions must be one of the three slots in each group.");
  }

  const source = findEditableGroup(project, sourceGroupId);
  if (!source.ok) {
    return source;
  }
  const targetIsPlaceholder = targetGroupId === PLACEHOLDER_GROUP_ID;
  const target = targetIsPlaceholder
    ? undefined
    : findEditableGroup(project, targetGroupId);
  if (target && !target.ok) {
    return failure(target.error);
  }

  const movingPost = source.value.posts[sourcePostIndex];
  if (!isPostPopulated(movingPost)) {
    return failure("Only a populated post can be moved to another group.");
  }
  const targetGroup = target?.ok ? target.value : createEmptyGroup();
  if (isPostPopulated(targetGroup.posts[targetPostIndex])) {
    return failure("Posts can only move to an empty destination slot.");
  }

  const sourcePosts = [...source.value.posts] as GroupEntry["posts"];
  const targetPosts = [...targetGroup.posts] as GroupEntry["posts"];
  const emptySourcePost = targetPosts[targetPostIndex];
  sourcePosts[sourcePostIndex] = emptySourcePost;
  targetPosts[targetPostIndex] = movingPost;

  const updatedTarget = withReadiness({ ...targetGroup, posts: targetPosts });
  const groups = project.groups.map((group) => {
    if (group.id === sourceGroupId) {
      return withReadiness({ ...group, posts: sourcePosts });
    }
    if (!targetIsPlaceholder && group.id === targetGroupId) {
      return updatedTarget;
    }
    return group;
  });
  if (targetIsPlaceholder) {
    groups.push(updatedTarget);
  }

  return success({ ...project, groups });
}

export function insertGroup(
  project: ProjectData,
  index: number,
  group: GroupEntry = createEmptyGroup()
): LayoutOperationResult {
  const publishedCount = publishedBlockBoundary(project.groups);
  if (publishedCount === undefined) {
    return failure("Published groups must remain together at the top of the project.");
  }
  if (!Number.isInteger(index) || index < publishedCount || index > project.groups.length) {
    return failure("New groups must be inserted in the unpublished section.");
  }

  const groups = [...project.groups];
  groups.splice(index, 0, group);
  return success({ ...project, groups });
}

export function deleteGroup(
  project: ProjectData,
  groupId: string,
  confirmed = false
): LayoutOperationResult {
  const group = project.groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    return failure("The selected group no longer exists.");
  }
  if (group.publicationStatus === "published") {
    return failure("Published groups are locked and cannot be deleted.");
  }
  if (isGroupPopulated(group) && !confirmed) {
    return {
      ok: false,
      reason: "confirmation-required",
      error: "This group contains images or descriptions. Confirm deletion to continue."
    };
  }

  return success({
    ...project,
    groups: project.groups.filter((candidate) => candidate.id !== groupId)
  });
}

function findEditableGroup(
  project: ProjectData,
  groupId: string
): { ok: true; value: GroupEntry } | Extract<LayoutOperationResult, { ok: false }> {
  const group = project.groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    return failure("The selected group no longer exists.");
  }
  if (group.publicationStatus === "published") {
    return failure("Published groups are locked.");
  }
  return { ok: true, value: group };
}

function replaceGroup(project: ProjectData, updatedGroup: GroupEntry): LayoutOperationResult {
  return success({
    ...project,
    groups: project.groups.map((group) =>
      group.id === updatedGroup.id ? updatedGroup : group
    )
  });
}

function withReadiness(group: GroupEntry): GroupEntry {
  if (group.publicationStatus === "published") {
    return group;
  }

  return {
    ...group,
    publicationStatus: group.posts.every((post) => post.images.length > 0) ? "ready" : "not ready"
  };
}

function getAssignedFilenames(project: ProjectData): Set<string> {
  return new Set(project.groups.flatMap((group) => group.posts.flatMap((post) => post.images)));
}

function publishedBlockBoundary(groups: GroupEntry[]): number | undefined {
  const boundary = groups.findIndex((group) => group.publicationStatus !== "published");
  const firstUnpublishedIndex = boundary < 0 ? groups.length : boundary;
  const hasPublishedAfterBoundary = groups
    .slice(firstUnpublishedIndex)
    .some((group) => group.publicationStatus === "published");

  return hasPublishedAfterBoundary ? undefined : firstUnpublishedIndex;
}

function isPostPopulated(post: PostEntry): boolean {
  return (
    post.images.length > 0 ||
    (post.description.length > 0 && post.description !== ".") ||
    post.hashtags.length > 0
  );
}

function isGroupPopulated(group: GroupEntry): boolean {
  return group.posts.some(isPostPopulated);
}

function isPostIndex(index: number): index is 0 | 1 | 2 {
  return Number.isInteger(index) && index >= 0 && index < 3;
}

function success(project: ProjectData): LayoutOperationResult {
  return { ok: true, project };
}

function failure(error: string): Extract<LayoutOperationResult, { ok: false }> {
  return { ok: false, reason: "invalid-operation", error };
}
