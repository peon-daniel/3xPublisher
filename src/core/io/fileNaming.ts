export const CANONICAL_PROJECT_FILENAME = "instagram-plan.json";

const NUMBERED_FILENAME_PATTERN = /^instagram-plan-(\d{3,})\.json$/;

export function formatNumberedExportFilename(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError("Export sequence must be a positive safe integer.");
  }

  return `instagram-plan-${String(sequence).padStart(3, "0")}.json`;
}

export function getNextNumberedExportFilename(existingFilenames: Iterable<string>): string {
  let highestSequence = 0;

  for (const filename of existingFilenames) {
    const match = NUMBERED_FILENAME_PATTERN.exec(filename);
    if (!match) {
      continue;
    }

    const sequence = Number(match[1]);
    if (Number.isSafeInteger(sequence) && sequence > highestSequence) {
      highestSequence = sequence;
    }
  }

  if (highestSequence >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("No safe numbered export filename is available.");
  }

  return formatNumberedExportFilename(highestSequence + 1);
}
