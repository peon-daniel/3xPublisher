export interface SelectedDirectoryFile {
  file: File;
  relativePath: string;
}

interface DirectoryFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

export interface ProjectDirectoryHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<unknown>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<WritableProjectFileHandle>;
}

export interface WritableProjectFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
    abort?(): Promise<void>;
  }>;
}

export type DirectoryPicker = (
  options: { mode: "readwrite" }
) => Promise<ProjectDirectoryHandle>;

export type ReadSelectedDirectoryResult =
  | {
      ok: true;
      directoryName: string;
      files: SelectedDirectoryFile[];
      handle: ProjectDirectoryHandle;
    }
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

  let directory: ProjectDirectoryHandle;
  try {
    directory = await picker({ mode: "readwrite" });
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
    return { ok: true, directoryName: directory.name, files, handle: directory };
  } catch (error) {
    return {
      ok: false,
      error: `Could not read the selected image folder: ${describeError(error)}`
    };
  }

}

export async function readDirectoryProjectFile(
  directory: ProjectDirectoryHandle,
  filename: string
): Promise<File | undefined> {
  try {
    const handle = await directory.getFileHandle(filename);
    return await handle.getFile();
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
}

async function readDirectory(
  directory: ProjectDirectoryHandle,
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

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "name") === "NotFoundError";
}

function isDirectoryDirectoryHandle(value: unknown): value is ProjectDirectoryHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "kind") === "directory" &&
    typeof Reflect.get(value, "name") === "string" &&
    typeof Reflect.get(value, "values") === "function" &&
    typeof Reflect.get(value, "getFileHandle") === "function"
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
