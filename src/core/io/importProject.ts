import type { ImportResult, ProjectData } from "../project/types";
import { normalizeProject } from "../schema/normalizeProject";
import { validateProject } from "../schema/validateProject";
import { parseProjectJson } from "./parseProjectJson";

export function importProject(jsonText: string): ImportResult {
  const parsed = parseProjectJson(jsonText);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: parsed.errors
    };
  }

  const validation = validateProject(parsed.value);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  return {
    ok: true,
    project: normalizeProject(parsed.value as ProjectData),
    warnings: validation.warnings
  };
}
