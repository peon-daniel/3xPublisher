export interface SelectedImageFile {
  name: string;
  type: string;
  relativePath: string;
}

export interface DiscoveredImage {
  filename: string;
  relativePath: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp"
]);

export function isSupportedImageFile(file: Pick<SelectedImageFile, "name" | "type">): boolean {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }

  const extensionIndex = file.name.lastIndexOf(".");
  if (extensionIndex < 0) {
    return false;
  }

  return IMAGE_EXTENSIONS.has(file.name.slice(extensionIndex).toLowerCase());
}

export function discoverSelectedImages(files: Iterable<SelectedImageFile>): DiscoveredImage[] {
  const discovered: DiscoveredImage[] = [];

  for (const file of files) {
    if (!isSupportedImageFile(file)) {
      continue;
    }

    discovered.push({
      filename: file.name,
      relativePath: file.relativePath || file.name
    });
  }

  return discovered;
}
