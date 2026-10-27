import "./styles.css";
import { detectFileAccessCapabilities } from "./adapters/fileAccess/capabilities";
import { readSelectedProjectFile } from "./adapters/fileAccess/readers";
import { downloadTextFile, saveWithFilePicker } from "./adapters/fileAccess/writers";
import { getNextNumberedExportFilename } from "./core/io/fileNaming";
import { importProject } from "./core/io/importProject";
import { createPersistenceState, transitionPersistenceState } from "./core/io/persistState";
import { serializeProject } from "./core/io/serializeProject";
import { createEmptyProject } from "./core/project/defaults";
import { discoverSelectedImages } from "./core/images/discoverImages";
import {
  applyImagePathResolutions,
  reconcileProjectImages
} from "./core/images/reconcileProjectImages";
import type { DiscoveredImage } from "./core/images/discoverImages";
import type { AmbiguousImageFilename } from "./core/images/reconcileProjectImages";
import type { PersistenceEvent, PersistenceState } from "./core/io/persistState";
import type { ProjectData } from "./core/project/types";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root #app not found");
}

const capabilities = detectFileAccessCapabilities();

app.innerHTML = `
  <main class="shell">
    <h1>3xPublisher</h1>
    <p>Plan and organize images for your Instagram grid.</p>
    <section class="project-io" aria-labelledby="project-io-title">
      <h2 id="project-io-title">Project file</h2>
      <label for="project-file">Open an existing JSON project</label>
      <input id="project-file" type="file" accept=".json,application/json" />
      <button id="new-project" type="button">Start a new project</button>
      <label for="export-filename">Export filename</label>
      <input id="export-filename" type="text" autocomplete="off" spellcheck="false" />
      <p class="help-text">The app cannot scan your project folder for existing export names. Choose a filename that does not conflict.</p>
      <button id="save-project" type="button">Save / Export JSON</button>
      <p id="project-status" class="status" role="status" aria-live="polite"></p>
      <p id="project-summary" class="summary"></p>
    </section>
    <section class="image-catalog" aria-labelledby="image-catalog-title">
      <h2 id="image-catalog-title">Image catalog</h2>
      <label for="image-files">Add selected image files</label>
      <input id="image-files" type="file" accept="image/*" multiple />
      <div id="folder-picker">
        <label for="image-folder">Reconcile against a selected project image folder</label>
        <input id="image-folder" type="file" accept="image/*" multiple webkitdirectory />
      </div>
      <p id="folder-help" class="help-text"></p>
      <p id="image-summary" class="summary"></p>
      <ul id="image-report" class="image-report" aria-live="polite"></ul>
    </section>
  </main>
`;

const fileInput = requireElement<HTMLInputElement>("#project-file");
const newProjectButton = requireElement<HTMLButtonElement>("#new-project");
const exportFilename = requireElement<HTMLInputElement>("#export-filename");
const saveButton = requireElement<HTMLButtonElement>("#save-project");
const status = requireElement<HTMLParagraphElement>("#project-status");
const summary = requireElement<HTMLParagraphElement>("#project-summary");
const imageFilesInput = requireElement<HTMLInputElement>("#image-files");
const imageFolderInput = requireElement<HTMLInputElement>("#image-folder");
const folderPicker = requireElement<HTMLDivElement>("#folder-picker");
const folderHelp = requireElement<HTMLParagraphElement>("#folder-help");
const imageSummary = requireElement<HTMLParagraphElement>("#image-summary");
const imageReport = requireElement<HTMLUListElement>("#image-report");

let project: ProjectData = createEmptyProject();
let persistence: PersistenceState = createPersistenceState();
let lastMessage = "New project. Changes have not been saved.";
let lastImageReport: string[] = [];
let lastAmbiguities: AmbiguousImageFilename[] = [];
let latestDiscoveredImages: DiscoveredImage[] = [];
let latestSourceComplete = false;
const resolvedImagePaths = new Map<string, string>();
const knownExportFilenames = new Set<string>();

folderPicker.hidden = !capabilities.directoryInput;
folderHelp.textContent = capabilities.directoryInput
  ? "Folder reconciliation uses exact filenames. You can choose a relative path for duplicate filenames; that choice is session-only."
  : "Folder scanning is unavailable in this browser. Add image files manually; files not selected will not be marked missing.";
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
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
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
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
  lastMessage = "New project created. Changes have not been saved.";
  render();
});

imageFilesInput.addEventListener("change", () => {
  reconcileSelectedFiles(imageFilesInput.files, false);
  imageFilesInput.value = "";
});

imageFolderInput.addEventListener("change", () => {
  reconcileSelectedFiles(imageFolderInput.files, capabilities.directoryInput);
  imageFolderInput.value = "";
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

function reconcileSelectedFiles(files: FileList | null, sourceComplete: boolean): void {
  const selectedFiles = Array.from(files ?? []);
  const discoveredImages = discoverSelectedImages(
    selectedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      relativePath: file.webkitRelativePath
    }))
  );

  if (discoveredImages.length === 0) {
    lastMessage = "No supported image files were found. The project was not changed.";
    lastImageReport = [];
    lastAmbiguities = [];
    render();
    return;
  }

  latestDiscoveredImages = discoveredImages;
  latestSourceComplete = sourceComplete;
  runImageReconciliation();
}

function runImageReconciliation(): void {
  const resolvedDiscovery = applyImagePathResolutions(
    latestDiscoveredImages,
    resolvedImagePaths
  );
  const result = reconcileProjectImages(project, resolvedDiscovery, {
    sourceComplete: latestSourceComplete
  });
  project = result.project;
  if (result.changed) {
    applyPersistenceEvent("project-changed");
  }

  lastImageReport = buildImageReport(result, latestSourceComplete);
  lastAmbiguities = result.ambiguities;
  const appliedResolutions = Array.from(resolvedImagePaths).filter(([filename, path]) =>
    latestDiscoveredImages.some(
      (image) => image.filename === filename && image.relativePath === path
    )
  );

  for (const [filename, path] of appliedResolutions) {
    lastImageReport.push(
      `Using "${path}" for "${filename}" during this session. This choice is not saved in project JSON.`
    );
  }

  lastMessage = result.ambiguities.length > 0
    ? "Some image filenames are ambiguous and need an explicit choice."
    : result.changed
      ? "Image catalog reconciled."
      : appliedResolutions.length > 0
        ? "Selected image sources for this session; project data did not need changes."
        : "No catalog changes were needed.";
  render();
}

function resolveImagePath(filename: string, relativePath: string): void {
  resolvedImagePaths.set(filename, relativePath);
  runImageReconciliation();
}

function buildImageReport(
  result: ReturnType<typeof reconcileProjectImages>,
  sourceComplete: boolean
): string[] {
  const messages: string[] = [];

  if (result.addedFilenames.length > 0) {
    messages.push(
      `Added ${result.addedFilenames.length} image(s) to Unassigned Photos: ${result.addedFilenames.join(", ")}`
    );
  }

  if (result.removedFilenames.length > 0) {
    messages.push(
      `Removed ${result.removedFilenames.length} unavailable image(s): ${result.removedFilenames.join(", ")}`
    );
  }

  for (const assignment of result.missingAssignments) {
    messages.push(
      `Removed missing image "${assignment.filename}" from ${assignment.published ? "published" : "unpublished"} post ${assignment.postId} in group ${assignment.groupId}.`
    );
  }

  if (!sourceComplete) {
    messages.push("Only selected files were checked; unselected project images were not treated as missing.");
  }

  return messages;
}

function isJsonFilename(value: string): boolean {
  return /^[A-Za-z0-9._-]+\.json$/i.test(value);
}

function render(): void {
  status.textContent = `${persistence.dirty ? "Unsaved changes" : statusLabel(persistence.status)}. ${lastMessage}`;
  status.dataset.dirty = String(persistence.dirty);
  summary.textContent = `Schema version ${project.schemaVersion} · ${project.images.length} image records · ${project.groups.length} groups`;
  const assignedFilenames = new Set(project.groups.flatMap((group) => group.posts.flatMap((post) => post.images)));
  const unassignedCount = project.images.filter((image) => !assignedFilenames.has(image.filename)).length;
  imageSummary.textContent = `${project.images.length} catalog image(s) · ${unassignedCount} unassigned`;
  imageReport.replaceChildren();
  for (const message of lastImageReport) {
    const item = document.createElement("li");
    item.textContent = message;
    imageReport.append(item);
  }

  for (const ambiguity of lastAmbiguities) {
    const item = document.createElement("li");
    const message = document.createElement("p");
    message.textContent =
      `Ambiguous filename "${ambiguity.filename}" found at ${ambiguity.relativePaths.join(" and ")}. Choose the intended file; this path choice applies only for the current session.`;

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Choose source file for ${ambiguity.filename}`);
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = "Choose a file path";
    select.append(prompt);

    for (const path of ambiguity.relativePaths) {
      const option = document.createElement("option");
      option.value = path;
      option.textContent = path;
      select.append(option);
    }

    const resolveButton = document.createElement("button");
    resolveButton.type = "button";
    resolveButton.textContent = "Use selected file";
    resolveButton.disabled = true;
    select.addEventListener("change", () => {
      resolveButton.disabled = select.value.length === 0;
    });
    resolveButton.addEventListener("click", () => {
      if (select.value.length > 0) {
        resolveImagePath(ambiguity.filename, select.value);
      }
    });

    item.append(message, select, resolveButton);
    imageReport.append(item);
  }
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
