import * as exifr from "exifr";

import { parseFilenameIdentifiers } from "./generateHashtags";

export interface ImageIdentifierAnalysis {
  identifiers: string[];
  source: "xmp" | "filename";
}

export function normalizeXmpSubject(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "_");
}

export async function readImageIdentifierAnalysis(
  file: File
): Promise<ImageIdentifierAnalysis> {
  try {
    const metadata = await exifr.parse(await file.arrayBuffer(), {
      tiff: false,
      xmp: true
    });
    const subjects = getXmpSubjects(metadata)
      .map(normalizeXmpSubject)
      .filter((subject) => subject.length > 0);
    if (subjects.length > 0) {
      return {
        identifiers: uniqueIdentifiers(subjects),
        source: "xmp"
      };
    }
  } catch {
    // Missing or unsupported XMP is expected; use the documented filename fallback.
  }

  return {
    identifiers: parseFilenameIdentifiers(file.name),
    source: "filename"
  };
}

function getXmpSubjects(metadata: unknown): string[] {
  if (!isRecord(metadata)) {
    return [];
  }
  const dc = isRecord(metadata.dc) ? metadata.dc : undefined;
  const xmp = isRecord(metadata.xmp) ? metadata.xmp : undefined;
  const xmpDc = xmp && isRecord(xmp.dc) ? xmp.dc : undefined;
  const subject =
    metadata.subject ?? dc?.subject ?? xmpDc?.subject ?? xmp?.subject;
  if (typeof subject === "string") {
    return [subject];
  }
  return Array.isArray(subject)
    ? subject.filter((value): value is string => typeof value === "string")
    : [];
}

function uniqueIdentifiers(identifiers: string[]): string[] {
  const seen = new Set<string>();
  return identifiers.filter((identifier) => {
    const key = identifier.toLocaleLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
