import "./styles.css";
import { detectFileAccessCapabilities } from "./adapters/fileAccess/capabilities";
import { readSelectedProjectFile } from "./adapters/fileAccess/readers";
import {
  readDirectoryProjectFile,
  readSelectedDirectory
} from "./adapters/fileAccess/readSelectedDirectory";
import type {
  ProjectDirectoryHandle,
  SelectedDirectoryFile
} from "./adapters/fileAccess/readSelectedDirectory";
import {
  downloadTextFile,
  saveWithFilePicker,
  writeSelectedFile
} from "./adapters/fileAccess/writers";
import { getNextNumberedExportFilename } from "./core/io/fileNaming";
import { importProject } from "./core/io/importProject";
import { selectProjectJsonFilename } from "./core/io/selectProjectJson";
import { createPersistenceState, transitionPersistenceState } from "./core/io/persistState";
import { serializeProject } from "./core/io/serializeProject";
import { createEmptyProject } from "./core/project/defaults";
import {
  deleteDictionaryRule,
  saveDictionaryRule,
  setDefaultHashtagLimit,
  updatePostContent,
  updatePostHashtagLimit,
  updateUnassignedImageDescriptions
} from "./core/hashtags/operations";
import { readImageIdentifierAnalysis } from "./core/hashtags/imageIdentifiers";
import type { ImageIdentifierAnalysis } from "./core/hashtags/imageIdentifiers";
import { collectDictionarySuggestions } from "./core/hashtags/dictionarySuggestions";
import type {
  AnalyzedImageIdentifiers,
  DictionarySuggestion
} from "./core/hashtags/dictionarySuggestions";
import type { ProjectContentResult } from "./core/hashtags/operations";
import {
  findNextReadyGroupId
} from "./core/preview/groupPreview";
import { discoverSelectedImages, isSupportedImageFile } from "./core/images/discoverImages";
import { sortUnassignedImages } from "./core/images/sortUnassignedImages";
import {
  applyImagePathResolutions,
  reconcileProjectImages
} from "./core/images/reconcileProjectImages";
import type { DiscoveredImage } from "./core/images/discoverImages";
import type { AmbiguousImageFilename } from "./core/images/reconcileProjectImages";
import {
  assignImageToPost,
  deleteGroup,
  insertGroup,
  moveCarouselImage,
  moveGroup,
  movePostToEmptySlot,
  movePostWithinGroup,
  moveUnassignedImage,
  moveUnassignedImageTo,
  PLACEHOLDER_GROUP_ID,
  removeImageFromPost,
  setImageHidden
} from "./core/layout/operations";
import type { LayoutOperationResult } from "./core/layout/operations";
import { bindWorkspaceEvents, renderWorkspace } from "./ui/workspace";
import type { WorkspaceActions, WorkspaceSelection } from "./ui/workspace";
import { renderDictionary } from "./ui/dictionary";
import type { PersistenceEvent, PersistenceState } from "./core/io/persistState";
import type { ProjectData } from "./core/project/types";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root #app not found");
}

const capabilities = detectFileAccessCapabilities();

app.innerHTML = `
  <main class="shell">
    <section id="setup-panel" class="setup-panel" aria-labelledby="app-title">
      <h1 id="app-title">3xPublisher</h1>
      <p>Choose your local project folder. Photos and project data stay on this device.</p>
      <button id="choose-image-folder" type="button">Choose project folder</button>
      <p id="folder-help" class="help-text"></p>
      <div id="fallback-project-controls" hidden>
        <label for="project-file">Open a project JSON file</label>
        <input id="project-file" type="file" accept=".json,application/json" />
        <button id="new-project" type="button">Start a new project</button>
        <label for="image-folder">Or choose a project image folder</label>
        <input id="image-folder" type="file" accept="image/*" multiple webkitdirectory />
      </div>
    </section>
    <header id="project-toolbar" class="project-toolbar" hidden>
      <h1>3xPublisher</h1>
      <span id="project-name" class="project-name"></span>
      <nav class="tabs" role="tablist" aria-label="Project views">
        <button id="planner-tab" type="button" role="tab" aria-selected="true" aria-controls="planner-panel">Planner</button>
        <button id="dictionary-tab" type="button" role="tab" aria-selected="false" aria-controls="dictionary-panel">Dictionary</button>
      </nav>
      <div class="toolbar-actions">
        <button id="save-project" type="button">Save now</button>
        <button id="export-project" type="button">Export copy</button>
      </div>
      <p id="project-status" class="status" role="status" aria-live="polite"></p>
      <p id="project-summary" class="summary"></p>
    </header>
    <section id="planner-panel" class="tab-panel" role="tabpanel" aria-labelledby="planner-tab">
      <section id="image-catalog" class="image-catalog" aria-labelledby="image-catalog-title">
        <div class="image-catalog-heading">
          <h2 id="image-catalog-title">Photos</h2>
          <label class="add-photos" for="image-files">＋ Add photos</label>
          <input id="image-files" type="file" accept="image/*" multiple />
        </div>
        <p id="image-summary" class="summary"></p>
        <ul id="image-report" class="image-report" aria-live="polite"></ul>
      </section>
      <div id="workspace-root"></div>
    </section>
    <section id="dictionary-panel" class="tab-panel" role="tabpanel" aria-labelledby="dictionary-tab" hidden>
      <div id="dictionary-root"></div>
    </section>
  </main>
`;

const fileInput = requireElement<HTMLInputElement>("#project-file");
const newProjectButton = requireElement<HTMLButtonElement>("#new-project");
const saveButton = requireElement<HTMLButtonElement>("#save-project");
const exportButton = requireElement<HTMLButtonElement>("#export-project");
const status = requireElement<HTMLParagraphElement>("#project-status");
const summary = requireElement<HTMLParagraphElement>("#project-summary");
const imageFilesInput = requireElement<HTMLInputElement>("#image-files");
const imageFolderInput = requireElement<HTMLInputElement>("#image-folder");
const chooseImageFolderButton = requireElement<HTMLButtonElement>("#choose-image-folder");
const fallbackProjectControls = requireElement<HTMLDivElement>("#fallback-project-controls");
const setupPanel = requireElement<HTMLElement>("#setup-panel");
const projectToolbar = requireElement<HTMLElement>("#project-toolbar");
const projectName = requireElement<HTMLSpanElement>("#project-name");
const imageCatalog = requireElement<HTMLElement>("#image-catalog");
const folderHelp = requireElement<HTMLParagraphElement>("#folder-help");
const imageSummary = requireElement<HTMLParagraphElement>("#image-summary");
const imageReport = requireElement<HTMLUListElement>("#image-report");
const workspaceRoot = requireElement<HTMLDivElement>("#workspace-root");
const dictionaryRoot = requireElement<HTMLDivElement>("#dictionary-root");
const plannerTab = requireElement<HTMLButtonElement>("#planner-tab");
const dictionaryTab = requireElement<HTMLButtonElement>("#dictionary-tab");
const plannerPanel = requireElement<HTMLElement>("#planner-panel");
const dictionaryPanel = requireElement<HTMLElement>("#dictionary-panel");

let project: ProjectData = createEmptyProject();
let persistence: PersistenceState = createPersistenceState();
let lastMessage = "New project. Changes have not been saved.";
let lastImageReport: string[] = [];
let lastAmbiguities: AmbiguousImageFilename[] = [];
let latestDiscoveredImages: DiscoveredImage[] = [];
let latestSourceComplete = false;
const resolvedImagePaths = new Map<string, string>();
const knownExportFilenames = new Set<string>();
const previewSources = new Map<string, { filename: string; url: string }>();
let showHidden = false;
let selectedImageFilename: string | null = null;
let workspaceSelection: WorkspaceSelection = null;
let selectedDescriptionFilenames = new Set<string>();
let bulkDescription = "";
let dictionarySampleFilename = "P8260673_d3, fp100, halfframe, rodinal.jpg";
let dictionaryMessage = "";
let activeTab: "planner" | "dictionary" = "planner";
let previewGroupId: string | null = null;
let fullImageFilename: string | null = null;
let projectDirectory: ProjectDirectoryHandle | null = null;
let activeProjectFilename: string | null = null;
let projectLoaded = false;
let projectRevision = 0;
let projectSession = 0;
let autoSaveTimer: number | undefined;
let autoSaveQueue: Promise<void> = Promise.resolve();
const imageIdentifiersByPath = new Map<string, ImageIdentifierAnalysis>();
let dismissedSuggestionIdentifiers = new Set<string>();
let lastDictionarySuggestions: DictionarySuggestion[] = [];
let folderIdentifierAnalyses: AnalyzedImageIdentifiers[] = [];

chooseImageFolderButton.hidden = !capabilities.directoryPicker;
fallbackProjectControls.hidden = capabilities.directoryPicker;
folderHelp.textContent = capabilities.directoryPicker
  ? "Choose a folder to read its photos and save the project locally. The app does not upload or modify your images."
  : "Folder auto-save is unavailable in this browser. Open a project JSON or start a project, then use file selection and export.";
bindWorkspaceEvents(workspaceRoot, createWorkspaceActions());
plannerTab.addEventListener("click", () => setActiveTab("planner"));
dictionaryTab.addEventListener("click", () => setActiveTab("dictionary"));
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
  startProjectSession();
  persistence = transitionPersistenceState(persistence, "loaded-from-selected-file");
  projectDirectory = null;
  activeProjectFilename = null;
  projectLoaded = true;
  setupPanel.hidden = true;
  projectToolbar.hidden = false;
  projectName.textContent = readResult.filename;
  clearPreviewSources();
  knownExportFilenames.add(readResult.filename);
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
  imageIdentifiersByPath.clear();
  dismissedSuggestionIdentifiers.clear();
  folderIdentifierAnalyses = [];
  selectedImageFilename = null;
  selectedDescriptionFilenames.clear();
  bulkDescription = "";
  workspaceSelection = null;
  previewGroupId = null;
  dictionaryMessage = "";
  showHidden = false;
  lastMessage =
    result.warnings.length > 0
      ? `Loaded "${readResult.filename}" with warnings: ${result.warnings.join(" ")}`
      : `Loaded "${readResult.filename}".`;
  render();
});

newProjectButton.addEventListener("click", () => {
  startProjectSession();
  project = createEmptyProject();
  projectDirectory = null;
  activeProjectFilename = null;
  projectLoaded = true;
  setupPanel.hidden = true;
  projectToolbar.hidden = false;
  projectName.textContent = "New project";
  markProjectChanged();
  clearPreviewSources();
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
  imageIdentifiersByPath.clear();
  dismissedSuggestionIdentifiers.clear();
  folderIdentifierAnalyses = [];
  selectedImageFilename = null;
  selectedDescriptionFilenames.clear();
  bulkDescription = "";
  workspaceSelection = null;
  previewGroupId = null;
  dictionaryMessage = "";
  showHidden = false;
  lastMessage = "New project created. Changes have not been saved.";
  render();
});

imageFilesInput.addEventListener("change", () => {
  const files = Array.from(imageFilesInput.files ?? []).map((file) => ({
    file,
    relativePath: file.name
  }));
  void analyzeAndReconcileSelectedImages(files, false);
  imageFilesInput.value = "";
});

imageFolderInput.addEventListener("change", () => {
  const files = Array.from(imageFolderInput.files ?? []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name
  }));
  void analyzeAndReconcileSelectedImages(files, capabilities.directoryInput);
  imageFolderInput.value = "";
});

chooseImageFolderButton.addEventListener("click", async () => {
  chooseImageFolderButton.disabled = true;
  const result = await readSelectedDirectory();
  chooseImageFolderButton.disabled = false;
  if (!result.ok) {
    if ("error" in result) {
      lastMessage = result.error;
      render();
    }
    return;
  }

  const topLevelFilenames = result.files
    .map((file) => file.relativePath)
    .filter((path) => path.startsWith(`${result.directoryName}/`))
    .map((path) => path.slice(result.directoryName.length + 1))
    .filter((path) => !path.includes("/"));
  const projectFilename = selectProjectJsonFilename(topLevelFilenames);
  let nextProject = createEmptyProject();
  if (projectFilename) {
    let projectFile: File | undefined;
    try {
      projectFile = await readDirectoryProjectFile(result.handle, projectFilename);
    } catch (error) {
      lastMessage = `Could not read "${projectFilename}": ${describeError(error)}`;
      render();
      return;
    }
    if (!projectFile) {
      lastMessage = `Could not find "${projectFilename}" in the selected folder. The project was not replaced.`;
      render();
      return;
    }
    const readResult = await readSelectedProjectFile(projectFile);
    if (!readResult.ok) {
      lastMessage = readResult.error;
      render();
      return;
    }
    const imported = importProject(readResult.text);
    if (!imported.ok) {
      lastMessage =
        `Could not load "${projectFilename}". ${imported.errors.join(" ")} The project was not replaced.`;
      render();
      return;
    }
    nextProject = imported.project;
    lastMessage =
      imported.warnings.length > 0
        ? `Loaded "${projectFilename}" with warnings: ${imported.warnings.join(" ")}`
        : `Loaded "${projectFilename}".`;
  } else {
    lastMessage = "New project created. Changes will auto-save to instagram-plan.json.";
  }

  clearPreviewSources();
  project = nextProject;
  startProjectSession();
  projectDirectory = result.handle;
  activeProjectFilename = projectFilename ?? "instagram-plan.json";
  projectLoaded = true;
  setupPanel.hidden = true;
  projectToolbar.hidden = false;
  projectName.textContent = `${result.directoryName} / ${activeProjectFilename}`;
  persistence = projectFilename
    ? transitionPersistenceState(persistence, "loaded-from-selected-file")
    : createPersistenceState();
  knownExportFilenames.clear();
  for (const filename of topLevelFilenames) {
    if (isJsonFilename(filename)) {
      knownExportFilenames.add(filename);
    }
  }
  lastAmbiguities = [];
  resolvedImagePaths.clear();
  dismissedSuggestionIdentifiers.clear();
  imageIdentifiersByPath.clear();
  workspaceSelection = null;
  previewGroupId = null;
  fullImageFilename = null;

  imageIdentifiersByPath.clear();
  await analyzeAndReconcileSelectedImages(result.files, true);
});

document.addEventListener("keydown", (event) => {
  if (
    (event.key !== "ArrowUp" && event.key !== "ArrowDown") ||
    shouldIgnoreLayoutShortcut(event.target) ||
    !workspaceSelection
  ) {
    return;
  }

  const direction = event.key === "ArrowUp" ? -1 : 1;
  event.preventDefault();
  if (workspaceSelection.kind === "group") {
    applyLayoutResult(moveGroup(project, workspaceSelection.groupId, direction));
  } else {
    applyLayoutResult(
      movePostWithinGroup(
        project,
        workspaceSelection.groupId,
        workspaceSelection.postIndex,
        direction
      )
    );
  }
});

saveButton.addEventListener("click", () => {
  void saveProjectNow();
});

exportButton.addEventListener("click", () => {
  exportProjectCopy();
});

window.addEventListener("beforeunload", (event) => {
  if (persistence.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

function applyPersistenceEvent(event: PersistenceEvent): void {
  persistence = transitionPersistenceState(persistence, event);
}

function markProjectChanged(): void {
  persistence = transitionPersistenceState(persistence, "project-changed");
  projectRevision += 1;
  scheduleAutoSave();
}

function scheduleAutoSave(): void {
  if (!projectDirectory || !projectLoaded) {
    return;
  }
  if (autoSaveTimer !== undefined) {
    window.clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = undefined;
    void enqueueDirectorySnapshot();
  }, 400);
}

function startProjectSession(): void {
  if (autoSaveTimer !== undefined) {
    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = undefined;
  }
  projectSession += 1;
}

function enqueueDirectorySnapshot(): Promise<void> {
  if (!projectDirectory) {
    return Promise.resolve();
  }

  const snapshot = {
    directory: projectDirectory,
    filename: activeProjectFilename ?? "instagram-plan.json",
    project,
    revision: projectRevision,
    session: projectSession
  };
  autoSaveQueue = autoSaveQueue.then(() => saveDirectorySnapshot(snapshot));
  return autoSaveQueue;
}

async function saveProjectNow(): Promise<void> {
  if (autoSaveTimer !== undefined) {
    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = undefined;
  }

  if (projectDirectory) {
    await enqueueDirectorySnapshot();
    return;
  }

  let contents: string;
  try {
    contents = serializeProject(project);
  } catch (error) {
    applyPersistenceEvent("persistence-failed");
    lastMessage = `Could not prepare the project for saving: ${describeError(error)}`;
    render();
    return;
  }

  const filename = activeProjectFilename ?? "instagram-plan.json";
  if (capabilities.saveFilePicker) {
    const result = await saveWithFilePicker(contents, filename);
    if (result.ok) {
      applyPersistenceEvent("save-succeeded");
      activeProjectFilename = filename;
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

  exportProjectCopy();
}

async function saveDirectorySnapshot(snapshot: {
  directory: ProjectDirectoryHandle;
  filename: string;
  project: ProjectData;
  revision: number;
  session: number;
}): Promise<void> {
  if (snapshot.session !== projectSession || snapshot.revision !== projectRevision) {
    return;
  }

  let contents: string;
  try {
    contents = serializeProject(snapshot.project);
  } catch (error) {
    if (snapshot.session === projectSession && snapshot.revision === projectRevision) {
      applyPersistenceEvent("persistence-failed");
      lastMessage = `Could not prepare the project for auto-save: ${describeError(error)}`;
      render();
    }
    return;
  }

  lastMessage = "Saving changes to the selected project folder…";
  render();
  let result: Awaited<ReturnType<typeof writeSelectedFile>>;
  try {
    const handle = await snapshot.directory.getFileHandle(snapshot.filename, { create: true });
    result = await writeSelectedFile(handle, contents);
  } catch (error) {
    result = {
      ok: false,
      error: `Could not open "${snapshot.filename}" in the selected folder: ${describeError(error)}`
    };
  }

  if (snapshot.session !== projectSession || snapshot.revision !== projectRevision) {
    return;
  }

  if (result.ok) {
    applyPersistenceEvent("save-succeeded");
    knownExportFilenames.add(snapshot.filename);
    lastMessage = `Project auto-saved to "${snapshot.filename}".`;
  } else {
    applyPersistenceEvent("persistence-failed");
    lastMessage = `${result.error} Changes remain in memory; use Export copy to make a backup.`;
  }
  render();
}

function exportProjectCopy(): void {
  if (!capabilities.download) {
    applyPersistenceEvent("persistence-failed");
    lastMessage = "This browser cannot download a project file.";
    render();
    return;
  }

  let contents: string;
  try {
    contents = serializeProject(project);
  } catch (error) {
    applyPersistenceEvent("persistence-failed");
    lastMessage = `Could not prepare the project for export: ${describeError(error)}`;
    render();
    return;
  }

  const filename = getNextNumberedExportFilename(knownExportFilenames);
  const result = downloadTextFile(contents, filename);
  if (result.ok) {
    applyPersistenceEvent("export-succeeded");
    knownExportFilenames.add(filename);
    lastMessage = `Download started as "${filename}". Copy it into your project folder.`;
  } else {
    applyPersistenceEvent("persistence-failed");
    lastMessage = result.error;
  }
  render();
}

async function analyzeAndReconcileSelectedImages(
  selectedFiles: SelectedDirectoryFile[],
  sourceComplete: boolean
): Promise<void> {
  const supportedFiles = selectedFiles.filter(({ file }) => isSupportedImageFile(file));
  const analyses = await Promise.all(
    supportedFiles.map(async ({ file, relativePath }) => ({
      filename: file.name,
      relativePath,
      analysis: await readImageIdentifierAnalysis(file)
    }))
  );
  for (const { relativePath, analysis } of analyses) {
    imageIdentifiersByPath.set(relativePath, analysis);
  }
  folderIdentifierAnalyses = Array.from(imageIdentifiersByPath, ([relativePath, analysis]) => ({
    filename: relativePath.split("/").at(-1) ?? relativePath,
    identifiers: analysis.identifiers,
    source: analysis.source
  }));
  lastDictionarySuggestions = collectDictionarySuggestions(
    folderIdentifierAnalyses,
    project.dictionary,
    dismissedSuggestionIdentifiers
  );
  reconcileSelectedImages(selectedFiles, sourceComplete);
}

function reconcileSelectedImages(
  selectedFiles: SelectedDirectoryFile[],
  sourceComplete: boolean
): void {
  cachePreviewSources(selectedFiles);
  const discoveredImages = discoverSelectedImages(
    selectedFiles.map(({ file, relativePath }) => ({
      name: file.name,
      type: file.type,
      relativePath
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
    markProjectChanged();
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
  lastDictionarySuggestions = collectDictionarySuggestions(
    folderIdentifierAnalyses,
    project.dictionary,
    dismissedSuggestionIdentifiers
  );
  setupPanel.hidden = projectLoaded;
  projectToolbar.hidden = !projectLoaded;
  plannerPanel.hidden = !projectLoaded || activeTab !== "planner";
  dictionaryPanel.hidden = !projectLoaded || activeTab !== "dictionary";
  status.textContent = `${persistence.dirty ? "Unsaved changes" : statusLabel(persistence.status)}. ${lastMessage}`;
  status.dataset.dirty = String(persistence.dirty);
  saveButton.disabled = !projectLoaded;
  exportButton.disabled = !projectLoaded;
  summary.textContent = `Schema version ${project.schemaVersion} · ${project.images.length} image records · ${project.groups.length} groups`;
  const assignedFilenames = new Set(project.groups.flatMap((group) => group.posts.flatMap((post) => post.images)));
  const unassignedCount = project.images.filter((image) => !assignedFilenames.has(image.filename)).length;
  imageSummary.textContent = `${project.images.length} catalog image(s) · ${unassignedCount} unassigned`;
  const hiddenCount = project.images.filter(
    (image) => image.hidden && !assignedFilenames.has(image.filename)
  ).length;
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

  renderWorkspace(workspaceRoot, {
    project,
    selectedImageFilename,
    showHidden,
    hiddenCount,
    selection: workspaceSelection,
    selectedDescriptionFilenames: Array.from(selectedDescriptionFilenames),
    bulkDescription,
    defaultHashtagLimit: project.settings.defaultHashtagLimit,
    previewGroupId,
    nextReadyGroupId: findNextReadyGroupId(project),
    fullImageFilename,
    imageUrlForFilename
  });
  const photoPane = workspaceRoot.querySelector<HTMLElement>(".unassigned-pane");
  if (photoPane) {
    photoPane.prepend(imageCatalog);
  }
  renderDictionary(dictionaryRoot, {
    dictionary: project.dictionary,
    defaultHashtagLimit: project.settings.defaultHashtagLimit,
    sampleFilename: dictionarySampleFilename,
    message: dictionaryMessage,
    suggestions: lastDictionarySuggestions,
    onSaveRule(previousIdentifier, identifier, hashtags) {
      const result = saveDictionaryRule(
        project.dictionary,
        previousIdentifier,
        identifier,
        hashtags
      );
      if (!result.ok) {
        dictionaryMessage = result.error;
        render();
        return;
      }
      project = { ...project, dictionary: result.dictionary };
      dictionaryMessage = "Dictionary rule saved.";
      applyContentChange("Dictionary rule saved; existing post hashtags were not changed.");
    },
    onDeleteRule(identifier) {
      if (!window.confirm(`Delete the "${identifier}" rule? Saved post hashtags will not change.`)) {
        return;
      }
      const result = deleteDictionaryRule(project.dictionary, identifier);
      if (!result.ok) {
        dictionaryMessage = result.error;
        render();
        return;
      }
      project = { ...project, dictionary: result.dictionary };
      dictionaryMessage = "Dictionary rule deleted.";
      applyContentChange("Dictionary rule deleted; saved post hashtags were not changed.");
    },
    onAcceptSuggestion(identifier) {
      const hashtag = `#${identifier}`;
      const result = saveDictionaryRule(project.dictionary, null, identifier, [hashtag]);
      if (!result.ok) {
        dictionaryMessage = result.error;
        render();
        return;
      }
      project = { ...project, dictionary: result.dictionary };
      dictionaryMessage = `Added ${identifier} → ${hashtag}. Existing post hashtags were not changed.`;
      applyContentChange(dictionaryMessage);
    },
    onDismissSuggestion(identifier) {
      dismissedSuggestionIdentifiers.add(identifier.toLocaleLowerCase());
      lastDictionarySuggestions = collectDictionarySuggestions(
        folderIdentifierAnalyses,
        project.dictionary,
        dismissedSuggestionIdentifiers
      );
      render();
    },
    onSetDefaultLimit(limit) {
      applyContentResult(
        setDefaultHashtagLimit(project, limit),
        "Default hashtag limit updated."
      );
    },
    onSampleFilenameChange(filename) {
      dictionarySampleFilename = filename;
    }
  });
  setActiveTab(activeTab);
}

function getVisibleUnassignedFilenames(): string[] {
  const assignedFilenames = new Set(
    project.groups.flatMap((group) => group.posts.flatMap((post) => post.images))
  );
  return sortUnassignedImages(
    project.images.filter(
      (image) =>
        !assignedFilenames.has(image.filename) &&
        (showHidden || !image.hidden)
    )
  ).map((image) => image.filename);
}

function imageIdentifiersForFilename(filename: string): string[] | undefined {
  const resolvedPath = resolvedImagePaths.get(filename);
  if (resolvedPath) {
    return imageIdentifiersByPath.get(resolvedPath)?.identifiers;
  }

  const matches = latestDiscoveredImages.filter((image) => image.filename === filename);
  if (matches.length !== 1) {
    return undefined;
  }
  return imageIdentifiersByPath.get(matches[0].relativePath)?.identifiers;
}

function createWorkspaceActions(): WorkspaceActions {
  return {
    onSelectImage(filename) {
      selectedImageFilename = selectedImageFilename === filename ? null : filename;
      render();
    },
    onSelectionChange(selection) {
      workspaceSelection = selection;
      render();
    },
    onToggleShowHidden() {
      showHidden = !showHidden;
      render();
    },
    onToggleHidden(filename, hidden) {
      applyLayoutResult(setImageHidden(project, filename, hidden));
    },
    onToggleDescriptionImage(filename, selected) {
      const image = project.images.find((candidate) => candidate.filename === filename);
      if (selected) {
        if (image && selectedDescriptionFilenames.size === 0) {
          bulkDescription = image.description;
        } else if (
          image &&
          image.description !== bulkDescription
        ) {
          bulkDescription = "";
        }
        selectedDescriptionFilenames.add(filename);
      } else {
        selectedDescriptionFilenames.delete(filename);
        if (selectedDescriptionFilenames.size === 0) {
          bulkDescription = "";
        }
      }
      render();
    },
    onMoveUnassignedImage(filename, direction) {
      applyLayoutResult(
        moveUnassignedImage(
          project,
          filename,
          direction,
          getVisibleUnassignedFilenames()
        )
      );
    },
    onMoveUnassignedImageTo(sourceFilename, targetFilename, insertAfter) {
      applyLayoutResult(
        moveUnassignedImageTo(
          project,
          sourceFilename,
          targetFilename,
          insertAfter,
          getVisibleUnassignedFilenames()
        )
      );
    },
    onBulkDescriptionChange(description) {
      bulkDescription = description;
    },
    onApplyBulkDescription() {
      const result = updateUnassignedImageDescriptions(
        project,
        Array.from(selectedDescriptionFilenames),
        bulkDescription
      );
      if (result.ok) {
        selectedDescriptionFilenames.clear();
      }
      applyContentResult(result, "Description saved for selected unassigned image(s).");
    },
    onUpdatePost(groupId, postIndex, description, hashtags) {
      applyContentResult(
        updatePostContent(project, groupId, postIndex, description, hashtags),
        "Caption saved."
      );
    },
    onUpdatePostLimit(groupId, postIndex, limit) {
      applyContentResult(
        updatePostHashtagLimit(project, groupId, postIndex, limit),
        "Post hashtag limit updated."
      );
    },
    onStartPreview(groupId) {
      if (!project.groups.some((group) => group.id === groupId && group.publicationStatus === "ready")) {
        setOperationError("There is no ready unpublished group to preview.");
        return;
      }
      previewGroupId = groupId;
      lastMessage = "Previewing the next ready group. Project order and saved JSON are unchanged.";
      render();
    },
    onCancelPreview() {
      previewGroupId = null;
      lastMessage = "Preview cancelled. Project order and saved JSON are unchanged.";
      render();
    },
    onMoveGroupToIndex(groupId, insertionIndex) {
      const sourceIndex = project.groups.findIndex((group) => group.id === groupId);
      if (sourceIndex < 0) {
        setOperationError("The selected group no longer exists.");
        return;
      }

      const finalIndex = insertionIndex - (sourceIndex < insertionIndex ? 1 : 0);
      let workingProject = project;
      let currentIndex = sourceIndex;
      while (currentIndex !== finalIndex) {
        const direction = finalIndex > currentIndex ? 1 : -1;
        const result = moveGroup(workingProject, groupId, direction);
        if (!result.ok) {
          setOperationError(result.error);
          return;
        }
        workingProject = result.project;
        currentIndex += direction;
      }
      if (workingProject !== project) {
        applyLayoutResult({ ok: true, project: workingProject });
      }
    },
    onMovePostToSlot(sourceGroupId, sourcePostIndex, targetGroupId, targetPostIndex) {
      if (sourceGroupId === targetGroupId) {
        let workingProject = project;
        let currentIndex = sourcePostIndex;
        while (currentIndex !== targetPostIndex) {
          const direction = targetPostIndex > currentIndex ? 1 : -1;
          const result = movePostWithinGroup(
            workingProject,
            sourceGroupId,
            currentIndex,
            direction
          );
          if (!result.ok) {
            setOperationError(result.error);
            return;
          }
          workingProject = result.project;
          currentIndex += direction;
        }
        if (workingProject !== project) {
          applyLayoutResult({ ok: true, project: workingProject });
        }
        return;
      }
      applyLayoutResult(
        movePostToEmptySlot(
          project,
          sourceGroupId,
          sourcePostIndex,
          targetGroupId,
          targetPostIndex
        )
      );
    },
    onMoveCarouselToIndex(groupId, postIndex, sourceImageIndex, targetImageIndex) {
      const group = project.groups.find((candidate) => candidate.id === groupId);
      if (!group || !group.posts[postIndex]) {
        setOperationError("The selected carousel no longer exists.");
        return;
      }

      let workingProject = project;
      let currentIndex = sourceImageIndex;
      const finalIndex = Math.min(
        targetImageIndex,
        group.posts[postIndex].images.length - 1
      );
      while (currentIndex !== finalIndex) {
        const direction = finalIndex > currentIndex ? 1 : -1;
        const result = moveCarouselImage(
          workingProject,
          groupId,
          postIndex,
          currentIndex,
          direction
        );
        if (!result.ok) {
          setOperationError(result.error);
          return;
        }
        workingProject = result.project;
        currentIndex += direction;
      }
      if (workingProject !== project) {
        applyLayoutResult({ ok: true, project: workingProject });
      }
    },
    onInsertGroup(index) {
      applyLayoutResult(insertGroup(project, index));
    },
    onDeleteGroup(groupId) {
      const result = deleteGroup(project, groupId);
      if (!result.ok && result.reason === "confirmation-required") {
        if (window.confirm(result.error)) {
          applyLayoutResult(deleteGroup(project, groupId, true));
        }
        return;
      }
      applyLayoutResult(result);
    },
    onAssignImage(filename, groupId, postIndex) {
      applyLayoutResult(
        assignImageToPost(
          project,
          filename,
          groupId,
          postIndex,
          imageIdentifiersForFilename(filename)
        )
      );
    },
    onRemoveImage(groupId, postIndex, imageIndex) {
      applyLayoutResult(removeImageFromPost(project, groupId, postIndex, imageIndex));
    },
    onMoveCarouselImage(groupId, postIndex, imageIndex, direction) {
      applyLayoutResult(moveCarouselImage(project, groupId, postIndex, imageIndex, direction));
    },
    onToggleFullImage(filename) {
      fullImageFilename = fullImageFilename === filename ? null : filename;
      render();
    },
    onMoveGroup(groupId, direction) {
      applyLayoutResult(moveGroup(project, groupId, direction));
    },
    onMovePost(groupId, postIndex, direction) {
      applyLayoutResult(movePostWithinGroup(project, groupId, postIndex, direction));
    },
    onAddGroup() {
      applyLayoutResult(insertGroup(project, project.groups.length));
    }
  };
}

function applyLayoutResult(
  result: LayoutOperationResult,
  successMessage = "Project layout updated."
): void {
  if (!result.ok) {
    setOperationError(result.error);
    return;
  }

  project = result.project;
  markProjectChanged();
  selectedImageFilename = null;
  const assignedFilenames = new Set(
    project.groups.flatMap((group) => group.posts.flatMap((post) => post.images))
  );
  selectedDescriptionFilenames = new Set(
    Array.from(selectedDescriptionFilenames).filter(
      (filename) =>
        project.images.some((image) => image.filename === filename) &&
        !assignedFilenames.has(filename)
    )
  );
  if (selectedDescriptionFilenames.size === 0) {
    bulkDescription = "";
  }
  let previewEnded = false;
  if (
    previewGroupId !== null &&
    !project.groups.some(
      (group) => group.id === previewGroupId && group.publicationStatus === "ready"
    )
  ) {
    previewGroupId = null;
    previewEnded = true;
  }
  lastMessage = previewEnded
    ? `${successMessage} Preview ended because the group is no longer ready.`
    : successMessage;
  render();
}

function applyContentResult(
  result: ProjectContentResult,
  successMessage: string
): void {
  if (!result.ok) {
    setOperationError(result.error);
    return;
  }
  project = result.project;
  applyContentChange(successMessage);
}

function applyContentChange(successMessage: string): void {
  markProjectChanged();
  lastMessage = successMessage;
  render();
}

function setActiveTab(tab: "planner" | "dictionary"): void {
  activeTab = tab;
  const isPlanner = tab === "planner";
  plannerTab.setAttribute("aria-selected", String(isPlanner));
  dictionaryTab.setAttribute("aria-selected", String(!isPlanner));
  plannerPanel.hidden = !projectLoaded || !isPlanner;
  dictionaryPanel.hidden = !projectLoaded || isPlanner;
}

function setOperationError(message: string): void {
  lastMessage = message;
  render();
}

function cachePreviewSources(selectedFiles: SelectedDirectoryFile[]): void {
  for (const { file, relativePath } of selectedFiles) {
    if (!isSupportedImageFile(file)) {
      continue;
    }

    const previous = previewSources.get(relativePath);
    if (previous) {
      URL.revokeObjectURL(previous.url);
    }
    previewSources.set(relativePath, {
      filename: file.name,
      url: URL.createObjectURL(file)
    });
  }
}

function clearPreviewSources(): void {
  for (const source of previewSources.values()) {
    URL.revokeObjectURL(source.url);
  }
  previewSources.clear();
  latestDiscoveredImages = [];
  latestSourceComplete = false;
}

function imageUrlForFilename(filename: string): string | undefined {
  const resolvedPath = resolvedImagePaths.get(filename);
  if (resolvedPath) {
    const resolvedSource = previewSources.get(resolvedPath);
    if (resolvedSource?.filename === filename) {
      return resolvedSource.url;
    }
  }

  const currentlyDiscovered = latestDiscoveredImages.filter(
    (image) => image.filename === filename
  );
  if (currentlyDiscovered.length === 1) {
    return previewSources.get(currentlyDiscovered[0].relativePath)?.url;
  }

  const matches = Array.from(previewSources.values()).filter(
    (source) => source.filename === filename
  );
  return matches.length === 1 ? matches[0].url : undefined;
}

function shouldIgnoreLayoutShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.closest("button, a, [role='tab'], [role='button']") !== null
  );
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
