import "./styles.css";
import { detectFileAccessCapabilities } from "./adapters/fileAccess/capabilities";
import { readSelectedProjectFile } from "./adapters/fileAccess/readers";
import { downloadTextFile, saveWithFilePicker } from "./adapters/fileAccess/writers";
import { getNextNumberedExportFilename } from "./core/io/fileNaming";
import { importProject } from "./core/io/importProject";
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
    <nav class="tabs" role="tablist" aria-label="Project views">
      <button id="planner-tab" type="button" role="tab" aria-selected="true" aria-controls="planner-panel">Planner</button>
      <button id="dictionary-tab" type="button" role="tab" aria-selected="false" aria-controls="dictionary-panel">Dictionary</button>
    </nav>
    <section id="planner-panel" class="tab-panel" role="tabpanel" aria-labelledby="planner-tab">
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
      <div id="workspace-root"></div>
    </section>
    <section id="dictionary-panel" class="tab-panel" role="tabpanel" aria-labelledby="dictionary-tab" hidden>
      <div id="dictionary-root"></div>
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

folderPicker.hidden = !capabilities.directoryInput;
folderHelp.textContent = capabilities.directoryInput
  ? "Folder reconciliation uses exact filenames. You can choose a relative path for duplicate filenames; that choice is session-only."
  : "Folder scanning is unavailable in this browser. Add image files manually; files not selected will not be marked missing.";
exportFilename.value = nextExportFilename();
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
  persistence = transitionPersistenceState(persistence, "loaded-from-selected-file");
  clearPreviewSources();
  knownExportFilenames.add(readResult.filename);
  exportFilename.value = nextExportFilename();
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
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
  project = createEmptyProject();
  persistence = transitionPersistenceState(persistence, "project-changed");
  clearPreviewSources();
  exportFilename.value = nextExportFilename();
  lastImageReport = [];
  lastAmbiguities = [];
  resolvedImagePaths.clear();
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
  reconcileSelectedFiles(imageFilesInput.files, false);
  imageFilesInput.value = "";
});

imageFolderInput.addEventListener("change", () => {
  reconcileSelectedFiles(imageFolderInput.files, capabilities.directoryInput);
  imageFolderInput.value = "";
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
  cachePreviewSources(selectedFiles);
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
    imageUrlForFilename
  });
  renderDictionary(dictionaryRoot, {
    dictionary: project.dictionary,
    defaultHashtagLimit: project.settings.defaultHashtagLimit,
    sampleFilename: dictionarySampleFilename,
    message: dictionaryMessage,
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
      applyLayoutResult(assignImageToPost(project, filename, groupId, postIndex));
    },
    onRemoveImage(groupId, postIndex, imageIndex) {
      applyLayoutResult(removeImageFromPost(project, groupId, postIndex, imageIndex));
    },
    onMoveCarouselImage(groupId, postIndex, imageIndex, direction) {
      applyLayoutResult(moveCarouselImage(project, groupId, postIndex, imageIndex, direction));
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
  persistence = transitionPersistenceState(persistence, "project-changed");
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
  persistence = transitionPersistenceState(persistence, "project-changed");
  lastMessage = successMessage;
  render();
}

function setActiveTab(tab: "planner" | "dictionary"): void {
  activeTab = tab;
  const isPlanner = tab === "planner";
  plannerTab.setAttribute("aria-selected", String(isPlanner));
  dictionaryTab.setAttribute("aria-selected", String(!isPlanner));
  plannerPanel.hidden = !isPlanner;
  dictionaryPanel.hidden = isPlanner;
}

function setOperationError(message: string): void {
  lastMessage = message;
  render();
}

function cachePreviewSources(files: File[]): void {
  for (const file of files) {
    if (!isSupportedImageFile(file)) {
      continue;
    }

    const relativePath = file.webkitRelativePath || file.name;
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
