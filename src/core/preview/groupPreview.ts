import type { GroupEntry, ProjectData } from "../project/types";

export function findNextReadyGroupId(project: ProjectData): string | null {
  return (
    project.groups.find((group) => group.publicationStatus === "ready")?.id ?? null
  );
}

export function projectGroupsForPreview(
  project: ProjectData,
  previewGroupId: string | null
): GroupEntry[] {
  const groups = [...project.groups];
  if (previewGroupId === null) {
    return groups;
  }

  const previewIndex = groups.findIndex(
    (group) =>
      group.id === previewGroupId && group.publicationStatus === "ready"
  );
  if (previewIndex < 0) {
    return groups;
  }

  const [previewGroup] = groups.splice(previewIndex, 1);
  groups.unshift(previewGroup);
  return groups;
}
