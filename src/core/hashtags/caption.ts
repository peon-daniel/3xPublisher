export function formatCaption(description: string, hashtags: string[]): string {
  return `${description.trim() || "."}\n\n${hashtags.join(" ")}`;
}
