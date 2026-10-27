import type { HashtagDictionary } from "./generateHashtags";

export interface AnalyzedImageIdentifiers {
  filename: string;
  identifiers: string[];
  source: "xmp" | "filename";
}

export interface DictionarySuggestion {
  identifier: string;
  source: "xmp" | "filename";
  imageCount: number;
}

export function collectDictionarySuggestions(
  analyses: AnalyzedImageIdentifiers[],
  dictionary: HashtagDictionary,
  dismissedIdentifiers: ReadonlySet<string> = new Set()
): DictionarySuggestion[] {
  const knownIdentifiers = new Set(
    Object.keys(dictionary).map((identifier) => identifier.trim().toLocaleLowerCase())
  );
  const suggestions = new Map<
    string,
    { identifier: string; source: "xmp" | "filename"; filenames: Set<string> }
  >();
  const dismissed = new Set(
    Array.from(dismissedIdentifiers, (identifier) => identifier.trim().toLocaleLowerCase())
  );

  for (const analysis of analyses) {
    for (const rawIdentifier of analysis.identifiers) {
      const identifier = rawIdentifier.trim();
      const key = identifier.toLocaleLowerCase();
      if (
        identifier.length === 0 ||
        knownIdentifiers.has(key) ||
        dismissed.has(key)
      ) {
        continue;
      }

      const existing = suggestions.get(key);
      if (existing) {
        existing.filenames.add(analysis.filename);
        if (analysis.source === "xmp") {
          existing.source = "xmp";
        }
      } else {
        suggestions.set(key, {
          identifier,
          source: analysis.source,
          filenames: new Set([analysis.filename])
        });
      }
    }
  }

  return Array.from(suggestions.values())
    .map(({ identifier, source, filenames }) => ({
      identifier,
      source,
      imageCount: filenames.size
    }))
    .sort((left, right) => left.identifier.localeCompare(right.identifier));
}
