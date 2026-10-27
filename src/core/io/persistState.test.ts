import { describe, expect, it } from "vitest";

import { createPersistenceState, transitionPersistenceState } from "./persistState";

describe("persistence state", () => {
  it("starts a new project as unsaved", () => {
    expect(createPersistenceState()).toEqual({
      status: "unsaved",
      dirty: true
    });
  });

  it("marks a loaded project clean and saved to its selected file", () => {
    expect(
      transitionPersistenceState(createPersistenceState(), "loaded-from-selected-file")
    ).toEqual({
      status: "saved-to-selected-file",
      dirty: false
    });
  });

  it("marks a project dirty after an edit", () => {
    const saved = transitionPersistenceState(createPersistenceState(), "save-succeeded");

    expect(transitionPersistenceState(saved, "project-changed")).toEqual({
      status: "unsaved",
      dirty: true
    });
  });

  it("clears dirty state only after the selected-file write succeeds", () => {
    expect(
      transitionPersistenceState(createPersistenceState(), "save-succeeded")
    ).toEqual({
      status: "saved-to-selected-file",
      dirty: false
    });
  });

  it("clears dirty state after download but preserves the copy-required status", () => {
    expect(
      transitionPersistenceState(createPersistenceState(), "export-succeeded")
    ).toEqual({
      status: "exported-download-needs-copy",
      dirty: false
    });
  });

  it("keeps the project dirty when persistence fails", () => {
    const edited = transitionPersistenceState(
      transitionPersistenceState(createPersistenceState(), "save-succeeded"),
      "project-changed"
    );

    expect(transitionPersistenceState(edited, "persistence-failed")).toEqual({
      status: "save-failed",
      dirty: true
    });
  });

  it("returns to unsaved after edits made following an export", () => {
    const exported = transitionPersistenceState(createPersistenceState(), "export-succeeded");

    expect(transitionPersistenceState(exported, "project-changed")).toEqual({
      status: "unsaved",
      dirty: true
    });
  });
});
