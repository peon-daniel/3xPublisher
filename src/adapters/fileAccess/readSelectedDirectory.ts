export interface SelectedDirectoryFile {
  file: File;
  relativePath: string;
}

interface DirectoryFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

interface DirectoryDirectoryHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<unknown>;
}

export type DirectoryPicker = (options: { mode: "read" }) => Promise<DirectoryDirectoryHandle>;

export type ReadSelectedDirectoryResult =
  | { ok: true; directoryName: string; files: SelectedDirectoryFile[] }
  | { ok: false; cancelled: true }
  | { ok: false; error: string };

export async function readSelectedDirectory(
  picker: DirectoryPicker | undefined = getBrowserDirectoryPicker()
): Promise<ReadSelectedDirectoryResult> {
  if (!picker) {
    return {
      ok: false,
      error: "Folder selection is not supported by this browser. Select image files instead."
    };
  }

  let directory: DirectoryDirectoryHandle;
  try {
    directory = await picker({ mode: "read" });
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, cancelled: true };
    }
    return {
      ok: false,
      error: `Could not select the image folder: ${describeError(error)}`
    };
  }

  try {
    const files = await readDirectory(directory, directory.name);
    return { ok: true, directoryName: directory.name, files };
  } catch (error) {
    return {
      ok: false,
      error: `Could not read the selected image folder: ${describeError(error)}`
    };
  }
}

async function readDirectory(
  directory: DirectoryDirectoryHandle,
  relativePath: string
): Promise<SelectedDirectoryFile[]> {
  const files: SelectedDirectoryFile[] = [];

  for await (const entry of directory.values()) {
    if (!isDirectoryDirectoryHandle(entry) && !isDirectoryFileHandle(entry)) {
      throw new Error("The browser returned an unsupported folder entry.");
    }
    const entryPath = `${relativePath}/${entry.name}`;
    if (entry.kind === "directory") {
      files.push(...(await readDirectory(entry, entryPath)));
    } else {
      files.push({
        file: await entry.getFile(),
        relativePath: entryPath
      });
    }
  }

  return files;
}

function getBrowserDirectoryPicker(): DirectoryPicker | undefined {
  const candidate = Reflect.get(globalThis, "showDirectoryPicker");
  if (typeof candidate !== "function") {
    return undefined;
  }

  return async (options) => {
    const handle: unknown = await Reflect.apply(candidate, globalThis, [options]);
    if (!isDirectoryDirectoryHandle(handle)) {
      throw new Error("The browser returned an invalid folder handle.");
    }
    return handle;
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "name") === "AbortError";
}

function isDirectoryDirectoryHandle(value: unknown): value is DirectoryDirectoryHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "kind") === "directory" &&
    typeof Reflect.get(value, "name") === "string" &&
    typeof Reflect.get(value, "values") === "function"
  );
}

function isDirectoryFileHandle(value: unknown): value is DirectoryFileHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "kind") === "file" &&
    typeof Reflect.get(value, "name") === "string" &&
    typeof Reflect.get(value, "getFile") === "function"
  );
}
