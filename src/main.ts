import "./styles.css";
import { detectFileAccessCapabilities } from "./adapters/fileAccess/capabilities";
import { readSelectedProjectFile } from "./adapters/fileAccess/readers";
import { downloadTextFile, saveWithFilePicker } from "./adapters/fileAccess/writers";
import { getNextNumberedExportFilename } from "./core/io/fileNaming";
import { importProject } from "./core/io/importProject";
import { createPersistenceState, transitionPersistenceState } from "./core/io/persistState";
import { serializeProject } from "./core/io/serializeProject";
import { createEmptyProject } from "./core/project/defaults";
import type { PersistenceEvent, PersistenceState } from "./core/io/persistState";
import type { ProjectData } from "./core/project/types";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root #app not found");
}

app.innerHTML = `
  <main class="shell">
    <h1>3xPublisher</h1>
    <p>Phase 2 project file import and export.</p>
    <section class="project-io" aria-labelledby="project-io-title">
      <h2 id="project-io-title">Project file</h2>
      <label for="project-file">Open an existing JSON project</label>
      <input id="project-file" type="file" accept=".json,application/json" />
      <button id="new-project" type="button">Start a new project</button>
      <label for="export-filename">Export filename</label>
      <input id="export-filename" type="text" autocomplete="off" spellcheck="false" />
      <p class="help-text">The app cannot scan your project folder. Choose a filename that does not conflict with an existing export.</p>
      <button id="save-project" type="button">Save / Export JSON</button>
      <p id="project-status" class="status" role="status" aria-live="polite"></p>
      <p id="project-summary" class="summary"></p>
    </section>
  </main>
`;

const fileInput = requireElement<HTMLInputElement>("#project-file");
const newProjectButton = requireElement<HTMLButtonElement>("#new-project");
const exportFilename = requireElement<HTMLInputElement>("#export-filename");
const saveButton = requireElement<HTMLButtonElement>("#save-project");
const status = requireElement<HTMLParagraphElement>("#project-status");
const summary = requireElement<HTMLParagraphElement>("#project-summary");
const capabilities = detectFileAccessCapabilities();

let project: ProjectData = createEmptyProject();
let persistence: PersistenceState = createPersistenceState();
let lastMessage = "New project. Changes have not been saved.";
const knownExportFilenames = new Set<string>();

exportFilename.value = nextExportFilename();
render();

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) {
    return;
  }

  const readResult = await readSelectedProjectFile(file);
  if (!readResult.ok) {
    lastMessage = readResult.error;
    render();
    return;
  }

  const result = importProject(readResult.text);
  if (!result.ok) {
    lastMessage = `Could not load "${readResult.filename}". ${result.errors.join(" ")}`;
    render();
    return;
  }

  project = result.project;
  persistence = transitionPersistenceState(persistence, "loaded-from-selected-file");
  knownExportFilenames.add(readResult.filename);
  exportFilename.value = nextExportFilename();
  lastMessage =
    result.warnings.length > 0
      ? `Loaded "${readResult.filename}" with warnings: ${result.warnings.join(" ")}`
      : `Loaded "${readResult.filename}".`;
  render();
});

newProjectButton.addEventListener("click", () => {
  project = createEmptyProject();
  persistence = transitionPersistenceState(persistence, "project-changed");
  exportFilename.value = nextExportFilename();
  lastMessage = "New project created. Changes have not been saved.";
  render();
});

saveButton.addEventListener("click", async () => {
  const filename = exportFilename.value.trim();
  if (!isJsonFilename(filename)) {
    lastMessage = "Enter a JSON filename using letters, numbers, dots, underscores, or hyphens.";
    render();
    return;
  }

  let contents: string;
  try {
    contents = serializeProject(project);
  } catch (error) {
    persistence = transitionPersistenceState(persistence, "persistence-failed");
    lastMessage = `Could not prepare the project for saving: ${describeError(error)}`;
    render();
    return;
  }

  if (capabilities.saveFilePicker) {
    const result = await saveWithFilePicker(contents, filename);
    if (result.ok) {
      applyPersistenceEvent("save-succeeded");
      knownExportFilenames.add(filename);
      lastMessage = "Project saved to the file you selected.";
    } else if ("cancelled" in result) {
      lastMessage = "Save cancelled. Your project remains unchanged.";
    } else {
      applyPersistenceEvent("persistence-failed");
      lastMessage = result.error;
    }
    render();
    return;
  }

  if (!capabilities.download) {
    applyPersistenceEvent("persistence-failed");
    lastMessage = "This browser cannot save or download a project file.";
    render();
    return;
  }

  const result = downloadTextFile(contents, filename);
  if (result.ok) {
    applyPersistenceEvent("export-succeeded");
    knownExportFilenames.add(filename);
    exportFilename.value = nextExportFilename();
    lastMessage = `Download started as "${filename}". Copy it into your project folder.`;
  } else {
    applyPersistenceEvent("persistence-failed");
    lastMessage = result.error;
  }
  render();
});

function applyPersistenceEvent(event: PersistenceEvent): void {
  persistence = transitionPersistenceState(persistence, event);
}

function nextExportFilename(): string {
  return getNextNumberedExportFilename(knownExportFilenames);
}

function isJsonFilename(value: string): boolean {
  return /^[A-Za-z0-9._-]+\.json$/i.test(value);
}

function render(): void {
  status.textContent = `${persistence.dirty ? "Unsaved changes" : statusLabel(persistence.status)}. ${lastMessage}`;
  status.dataset.dirty = String(persistence.dirty);
  summary.textContent = `Schema version ${project.schemaVersion} · ${project.images.length} image records · ${project.groups.length} groups`;
}

function statusLabel(value: PersistenceState["status"]): string {
  switch (value) {
    case "saved-to-selected-file":
      return "Saved to selected file";
    case "loaded-from-selected-file":
      return "Loaded from selected file";
    case "exported-download-needs-copy":
      return "Exported; copy the download into your project folder";
    case "save-failed":
      return "Save failed; changes remain unsaved";
    case "unsaved":
      return "Unsaved changes";
  }
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required app element ${selector} not found`);
  }
  return element;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
