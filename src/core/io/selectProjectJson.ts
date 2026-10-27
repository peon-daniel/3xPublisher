import { CANONICAL_PROJECT_FILENAME } from "./fileNaming";

const NUMBERED_PROJECT_PATTERN = /^instagram-plan-(\d{3,})\.json$/i;

export function selectProjectJsonFilename(
  filenames: Iterable<string>
): string | undefined {
  let canonicalFound = false;
  let highestNumber = 0;
  let highestFilename: string | undefined;

  for (const filename of filenames) {
    if (filename.toLowerCase() === CANONICAL_PROJECT_FILENAME) {
      canonicalFound = true;
      continue;
    }

    const match = NUMBERED_PROJECT_PATTERN.exec(filename);
    if (!match) {
      continue;
    }
    const sequence = Number(match[1]);
    if (Number.isSafeInteger(sequence) && sequence > highestNumber) {
      highestNumber = sequence;
      highestFilename = filename;
    }
  }

  return highestFilename ?? (canonicalFound ? CANONICAL_PROJECT_FILENAME : undefined);
}
