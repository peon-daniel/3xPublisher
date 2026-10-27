export interface FileAccessCapabilities {
  openFilePicker: boolean;
  saveFilePicker: boolean;
  directoryPicker: boolean;
  directoryInput: boolean;
  download: boolean;
}

export function detectFileAccessCapabilities(
  scope: object = globalThis
): FileAccessCapabilities {
  const document = Reflect.get(scope, "document");
  const url = Reflect.get(scope, "URL");
  const directoryInput = supportsDirectoryInput(document);

  return {
    openFilePicker: typeof Reflect.get(scope, "showOpenFilePicker") === "function",
    saveFilePicker: typeof Reflect.get(scope, "showSaveFilePicker") === "function",
    directoryPicker: typeof Reflect.get(scope, "showDirectoryPicker") === "function",
    directoryInput,
    download:
      typeof url === "function" &&
      typeof Reflect.get(url, "createObjectURL") === "function" &&
      typeof Reflect.get(url, "revokeObjectURL") === "function" &&
      isDocumentLike(document)
  };
}

function supportsDirectoryInput(document: unknown): boolean {
  if (!isRecord(document)) {
    return false;
  }

  const createElement = Reflect.get(document, "createElement");
  if (typeof createElement !== "function") {
    return false;
  }

  const input = Reflect.apply(createElement, document, ["input"]);
  return isRecord(input) && Reflect.has(input, "webkitdirectory");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDocumentLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const body = Reflect.get(value, "body");
  return (
    typeof Reflect.get(value, "createElement") === "function" &&
    isRecord(body) &&
    typeof Reflect.get(body, "appendChild") === "function"
  );
}
