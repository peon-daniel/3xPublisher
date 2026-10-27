export type HashtagDictionary = Record<string, string[]>;

export function parseFilenameIdentifiers(filename: string): string[] {
  const extensionIndex = filename.lastIndexOf(".");
  const stem = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  const tokens = stem
    .split(/[,\s_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return tokens.slice(1).map((token) => token.toLowerCase());
}

export function generateHashtags(
  filename: string,
  dictionary: HashtagDictionary
): string[] {
  return generateHashtagsFromIdentifiers(parseFilenameIdentifiers(filename), dictionary);
}

export function generateHashtagsFromIdentifiers(
  identifiers: string[],
  dictionary: HashtagDictionary
): string[] {
  const normalizedDictionary = new Map<string, string[]>();
  for (const [identifier, hashtags] of Object.entries(dictionary)) {
    const key = identifier.trim().toLowerCase();
    normalizedDictionary.set(key, [
      ...(normalizedDictionary.get(key) ?? []),
      ...hashtags
    ]);
  }

  const generated: string[] = [];
  const seen = new Set<string>();
  for (const identifier of identifiers) {
    for (const value of normalizedDictionary.get(identifier.trim().toLowerCase()) ?? []) {
      const hashtag = value.trim();
      const key = hashtag.toLowerCase();
      if (hashtag.length === 0 || seen.has(key)) {
        continue;
      }

      generated.push(hashtag);
      seen.add(key);
    }
  }

  return generated;
}
