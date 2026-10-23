import { SCHEMA_VERSION } from "../project/types";

export function isSupportedSchemaVersion(value: unknown): value is typeof SCHEMA_VERSION {
  return Number.isInteger(value) && value === SCHEMA_VERSION;
}
