export interface ParseSuccess {
  ok: true;
  value: unknown;
}

export interface ParseFailure {
  ok: false;
  errors: string[];
}

export type ParseResult = ParseSuccess | ParseFailure;

export function parseProjectJson(input: string): ParseResult {
  try {
    return {
      ok: true,
      value: JSON.parse(input)
    };
  } catch {
    return {
      ok: false,
      errors: ["Invalid JSON: unable to parse project file."]
    };
  }
}
