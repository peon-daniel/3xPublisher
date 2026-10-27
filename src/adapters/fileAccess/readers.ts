export interface SelectedProjectFile {
  name: string;
  text(): Promise<string>;
}

export type ReadProjectFileResult =
  | { ok: true; filename: string; text: string }
  | { ok: false; filename: string; error: string };

export async function readSelectedProjectFile(
  file: SelectedProjectFile
): Promise<ReadProjectFileResult> {
  try {
    return {
      ok: true,
      filename: file.name,
      text: await file.text()
    };
  } catch (error) {
    return {
      ok: false,
      filename: file.name,
      error: `Could not read "${file.name}": ${describeError(error)}`
    };
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
