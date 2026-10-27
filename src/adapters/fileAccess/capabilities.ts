export interface FileAccessCapabilities {
  openFilePicker: boolean;
  saveFilePicker: boolean;
  directoryPicker: boolean;
  download: boolean;
}

export function detectFileAccessCapabilities(
  scope: object = globalThis
): FileAccessCapabilities {
  const document = Reflect.get(scope, "document");
  const url = Reflect.get(scope, "URL");

  return {
    openFilePicker: typeof Reflect.get(scope, "showOpenFilePicker") === "function",
    saveFilePicker: typeof Reflect.get(scope, "showSaveFilePicker") === "function",
    directoryPicker: typeof Reflect.get(scope, "showDirectoryPicker") === "function",
    download:
      typeof url === "function" &&
      typeof Reflect.get(url, "createObjectURL") === "function" &&
      typeof Reflect.get(url, "revokeObjectURL") === "function" &&
      isDocumentLike(document)
  };
}

function isDocumentLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = Reflect.get(value, "body");
  return (
    typeof Reflect.get(value, "createElement") === "function" &&
    typeof body === "object" &&
    body !== null &&
    typeof Reflect.get(body, "appendChild") === "function"
  );
}
