import type { ImageEntry } from "../project/types";

export function sortUnassignedImages(images: ImageEntry[]): ImageEntry[] {
  return [...images].sort((left, right) => {
    if (left.unassignedOrder !== null && right.unassignedOrder !== null) {
      return (
        left.unassignedOrder - right.unassignedOrder ||
        left.filename.localeCompare(right.filename)
      );
    }
    if (left.unassignedOrder !== null) {
      return -1;
    }
    if (right.unassignedOrder !== null) {
      return 1;
    }
    return left.filename.localeCompare(right.filename);
  });
}
