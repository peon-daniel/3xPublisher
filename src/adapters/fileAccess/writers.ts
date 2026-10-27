export interface WritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

export interface WritableFileHandle {
  createWritable(): Promise<WritableFileStream>;
}

export type WriteFileResult =
  | { ok: true }
  | { ok: false; error: string };

export interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

export type SaveFilePicker = (
  options: SaveFilePickerOptions
) => Promise<WritableFileHandle>;

export type SaveWithPickerResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; cancelled: true };

export interface DownloadAnchor {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}

export interface DownloadEnvironment {
  createAndAppendAnchor(): DownloadAnchor;
  url: {
    createObjectURL(blob: Blob): string;
    revokeObjectURL(url: string): void;
  };
}

export async function writeSelectedFile(
  handle: WritableFileHandle,
  contents: string
): Promise<WriteFileResult> {
  let writable: WritableFileStream | undefined;

  try {
    writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
    return { ok: true };
  } catch (error) {
    const cleanupErrors: string[] = [];

    if (writable?.abort) {
      try {
        await writable.abort();
      } catch (abortError) {
        cleanupErrors.push(`Could not abort the incomplete write: ${describeError(abortError)}`);
      }
    }

    const cleanupMessage = cleanupErrors.length > 0 ? ` ${cleanupErrors.join(" ")}` : "";
    return {
      ok: false,
      error: `Could not save the selected file: ${describeError(error)}.${cleanupMessage}`
    };
  }
}

export async function saveWithFilePicker(
  contents: string,
  suggestedName: string,
  picker: SaveFilePicker | undefined = getBrowserSaveFilePicker()
): Promise<SaveWithPickerResult> {
  if (!picker) {
    return {
      ok: false,
      error: "Direct file saving is not supported by this browser."
    };
  }

  let handle: WritableFileHandle;
  try {
    handle = await picker({
      suggestedName,
      types: [
        {
          description: "JSON project file",
          accept: { "application/json": [".json"] }
        }
      ]
    });
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, cancelled: true };
    }

    return {
      ok: false,
      error: `Could not open the save dialog: ${describeError(error)}`
    };
  }

  return writeSelectedFile(handle, contents);
}

export function downloadTextFile(
  contents: string,
  filename: string,
  environment?: DownloadEnvironment
): WriteFileResult {
  let objectUrl: string | undefined;
  let anchor: DownloadAnchor | undefined;
  let operationError: unknown;
  let cleanupErrors: string[] = [];

  try {
    const browserEnvironment = environment ?? {
      createAndAppendAnchor: () => {
        const element = document.createElement("a");
        document.body.appendChild(element);
        return element;
      },
      url: URL
    };
    const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
    objectUrl = browserEnvironment.url.createObjectURL(blob);
    anchor = browserEnvironment.createAndAppendAnchor();
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } catch (error) {
    operationError = error;
  }

  if (anchor) {
    try {
      anchor.remove();
    } catch (error) {
      cleanupErrors.push(`Could not remove the temporary download link: ${describeError(error)}.`);
    }
  }

  if (objectUrl !== undefined) {
    try {
      (environment?.url ?? URL).revokeObjectURL(objectUrl);
    } catch (error) {
      cleanupErrors.push(`Could not release the temporary download URL: ${describeError(error)}.`);
    }
  }

  if (operationError !== undefined || cleanupErrors.length > 0) {
    const operationMessage =
      operationError === undefined
        ? ""
        : `Could not start the JSON download: ${describeError(operationError)}.`;
    const separator = operationMessage.length > 0 && cleanupErrors.length > 0 ? " " : "";
    return {
      ok: false,
      error: `${operationMessage}${separator}${cleanupErrors.join(" ")}`
    };
  }

  return { ok: true };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getBrowserSaveFilePicker(): SaveFilePicker | undefined {
  const candidate = Reflect.get(globalThis, "showSaveFilePicker");
  return isSaveFilePicker(candidate) ? candidate.bind(globalThis) : undefined;
}

function isSaveFilePicker(value: unknown): value is SaveFilePicker {
  return typeof value === "function";
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "name") === "AbortError";
}
