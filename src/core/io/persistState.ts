export type PersistenceStatus =
  | "unsaved"
  | "saved-to-selected-file"
  | "loaded-from-selected-file"
  | "exported-download-needs-copy"
  | "save-failed";

export interface PersistenceState {
  status: PersistenceStatus;
  dirty: boolean;
}

export type PersistenceEvent =
  | "project-changed"
  | "save-succeeded"
  | "export-succeeded"
  | "persistence-failed"
  | "loaded-from-selected-file";

export function createPersistenceState(): PersistenceState {
  return {
    status: "unsaved",
    dirty: true
  };
}

export function transitionPersistenceState(
  current: PersistenceState,
  event: PersistenceEvent
): PersistenceState {
  switch (event) {
    case "project-changed":
      return { status: "unsaved", dirty: true };
    case "save-succeeded":
      return { status: "saved-to-selected-file", dirty: false };
    case "export-succeeded":
      return { status: "exported-download-needs-copy", dirty: false };
    case "persistence-failed":
      return { status: "save-failed", dirty: true };
    case "loaded-from-selected-file":
      return { status: "loaded-from-selected-file", dirty: false };
  }
}
