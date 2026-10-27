import { createEmptyGroup } from "../core/project/defaults";
import type { GroupEntry, ImageEntry, PostEntry, ProjectData } from "../core/project/types";
import { PLACEHOLDER_GROUP_ID } from "../core/layout/operations";
import { formatCaption } from "../core/hashtags/caption";
import { projectGroupsForPreview } from "../core/preview/groupPreview";
import { sortUnassignedImages } from "../core/images/sortUnassignedImages";

const IMAGE_TRANSFER_TYPE = "application/x-3xpublisher-image";
const GROUP_TRANSFER_TYPE = "application/x-3xpublisher-group";
const POST_TRANSFER_TYPE = "application/x-3xpublisher-post";
const CAROUSEL_TRANSFER_TYPE = "application/x-3xpublisher-carousel";

export type WorkspaceSelection =
  | { kind: "group"; groupId: string }
  | { kind: "post"; groupId: string; postIndex: number }
  | null;

export interface WorkspaceOptions {
  project: ProjectData;
  selectedImageFilename: string | null;
  showHidden: boolean;
  hiddenCount: number;
  selection: WorkspaceSelection;
  selectedDescriptionFilenames: string[];
  bulkDescription: string;
  defaultHashtagLimit: number;
  previewGroupId: string | null;
  nextReadyGroupId: string | null;
  imageUrlForFilename(filename: string): string | undefined;
}

export interface WorkspaceActions {
  onSelectImage(filename: string): void;
  onSelectionChange(selection: WorkspaceSelection): void;
  onToggleShowHidden(): void;
  onToggleHidden(filename: string, hidden: boolean): void;
  onToggleDescriptionImage(filename: string, selected: boolean): void;
  onMoveUnassignedImage(filename: string, direction: -1 | 1): void;
  onMoveUnassignedImageTo(
    sourceFilename: string,
    targetFilename: string,
    insertAfter: boolean
  ): void;
  onBulkDescriptionChange(description: string): void;
  onApplyBulkDescription(): void;
  onUpdatePost(
    groupId: string,
    postIndex: number,
    description: string,
    hashtags: string[]
  ): void;
  onUpdatePostLimit(groupId: string, postIndex: number, limit: number | null): void;
  onStartPreview(groupId: string): void;
  onCancelPreview(): void;
  onMoveGroupToIndex(groupId: string, index: number): void;
  onMovePostToSlot(
    sourceGroupId: string,
    sourcePostIndex: number,
    targetGroupId: string,
    targetPostIndex: number
  ): void;
  onMoveCarouselToIndex(
    groupId: string,
    postIndex: number,
    sourceImageIndex: number,
    targetImageIndex: number
  ): void;
  onInsertGroup(index: number): void;
  onDeleteGroup(groupId: string): void;
  onAssignImage(filename: string, groupId: string, postIndex: number): void;
  onRemoveImage(groupId: string, postIndex: number, imageIndex: number): void;
  onMoveCarouselImage(
    groupId: string,
    postIndex: number,
    imageIndex: number,
    direction: -1 | 1
  ): void;
  onMoveGroup(groupId: string, direction: -1 | 1): void;
  onMovePost(groupId: string, postIndex: number, direction: -1 | 1): void;
  onAddGroup(): void;
}

export function bindWorkspaceEvents(
  root: HTMLElement,
  actions: WorkspaceActions
): void {
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (button && !button.disabled) {
      runButtonAction(button, actions);
      return;
    }

    const postCard = target.closest<HTMLElement>("[data-post-card]");
    if (postCard) {
      if (postCard.dataset.placeholder === "true") {
        return;
      }
      actions.onSelectionChange({
        kind: "post",
        groupId: postCard.dataset.groupId ?? "",
        postIndex: Number(postCard.dataset.postIndex)
      });
      return;
    }

    const groupCard = target.closest<HTMLElement>("[data-group-card]");
    if (groupCard && groupCard.dataset.placeholder !== "true") {
      actions.onSelectionChange({
        kind: "group",
        groupId: groupCard.dataset.groupId ?? ""
      });
    }
  });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.action === "select-description-image") {
      actions.onToggleDescriptionImage(
        target.dataset.filename ?? "",
        target.checked
      );
    } else if (target.dataset.action === "set-post-limit") {
      actions.onUpdatePostLimit(
        target.dataset.groupId ?? "",
        Number(target.dataset.postIndex),
        target.value.length === 0 ? null : Number(target.value)
      );
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLTextAreaElement &&
      target.dataset.bulkDescription !== undefined
    ) {
      actions.onBulkDescriptionChange(target.value);
    }
  });

  root.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !event.dataTransfer) {
      return;
    }

    const carouselItem = target.closest<HTMLElement>("[data-carousel-item]");
    const image = target.closest<HTMLElement>("[data-image-filename]");
    const postHandle = target.closest<HTMLElement>("[data-drag-post]");
    const groupHandle = target.closest<HTMLElement>("[data-drag-group]");

    if (carouselItem) {
      event.dataTransfer.setData(CAROUSEL_TRANSFER_TYPE, [
        carouselItem.dataset.groupId ?? "",
        carouselItem.dataset.postIndex ?? "",
        carouselItem.dataset.imageIndex ?? ""
      ].join("\n"));
      event.dataTransfer.effectAllowed = "move";
    } else if (image) {
      event.dataTransfer.setData(IMAGE_TRANSFER_TYPE, image.dataset.imageFilename ?? "");
      event.dataTransfer.effectAllowed = "copy";
    } else if (postHandle) {
      event.dataTransfer.setData(POST_TRANSFER_TYPE, [
        postHandle.dataset.groupId ?? "",
        postHandle.dataset.postIndex ?? ""
      ].join("\n"));
      event.dataTransfer.effectAllowed = "move";
    } else if (groupHandle) {
      event.dataTransfer.setData(GROUP_TRANSFER_TYPE, groupHandle.dataset.groupId ?? "");
      event.dataTransfer.effectAllowed = "move";
    } else {
      event.preventDefault();
    }
  });

  root.addEventListener("dragover", (event) => {
    if (event.target instanceof Element && isDropTarget(event.target)) {
      event.preventDefault();
    }
  });

  root.addEventListener("drop", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !event.dataTransfer) {
      return;
    }

    const postCard = target.closest<HTMLElement>("[data-post-card]");
    const carouselItem = target.closest<HTMLElement>("[data-carousel-item]");
    const groupCard = target.closest<HTMLElement>("[data-group-card]");

    if (postCard) {
      event.preventDefault();
      handlePostDrop(event.dataTransfer, postCard, carouselItem, actions);
      return;
    }

    if (groupCard && groupCard.dataset.placeholder !== "true") {
      event.preventDefault();
      handleGroupDrop(event, event.dataTransfer, groupCard, actions);
      return;
    }

    const targetImage = target.closest<HTMLElement>("[data-image-filename]");
    if (targetImage) {
      const sourceFilename = event.dataTransfer.getData(IMAGE_TRANSFER_TYPE);
      const targetFilename = targetImage.dataset.imageFilename ?? "";
      if (sourceFilename && sourceFilename !== targetFilename) {
        event.preventDefault();
        const bounds = targetImage.getBoundingClientRect();
        actions.onMoveUnassignedImageTo(
          sourceFilename,
          targetFilename,
          event.clientY > bounds.top + bounds.height / 2
        );
      }
    }
  });
}

export function renderWorkspace(root: HTMLElement, options: WorkspaceOptions): void {
  root.replaceChildren();

  const layout = document.createElement("div");
  layout.className = "workspace";
  layout.dataset.selectedImage = options.selectedImageFilename ?? "";

  const unassignedPane = document.createElement("section");
  unassignedPane.className = "unassigned-pane";
  unassignedPane.setAttribute("aria-labelledby", "unassigned-title");
  const unassignedTitle = document.createElement("h2");
  unassignedTitle.id = "unassigned-title";
  unassignedTitle.textContent = "Unassigned Photos";
  unassignedPane.append(unassignedTitle);

  const unassignedList = document.createElement("ul");
  unassignedList.className = "unassigned-list";
  const assignedFilenames = new Set(
    options.project.groups.flatMap((group) => group.posts.flatMap((post) => post.images))
  );
  const unassignedImages = sortUnassignedImages(
    options.project.images.filter(
      (image) =>
        !assignedFilenames.has(image.filename) &&
        (options.showHidden || !image.hidden)
    )
  );

  if (unassignedImages.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = options.showHidden
      ? "No unassigned images."
      : "No visible unassigned images.";
    unassignedList.append(empty);
  }

  unassignedImages.forEach((image, index) => {
    unassignedList.append(
      renderUnassignedImage(
        image,
        index,
        unassignedImages.length,
        options
      )
    );
  });
  unassignedPane.append(unassignedList);
  const bulkDescriptionLabel = document.createElement("label");
  bulkDescriptionLabel.textContent = "Description for selected photo(s)";
  const bulkDescription = document.createElement("textarea");
  bulkDescription.rows = 3;
  bulkDescription.value = options.bulkDescription;
  bulkDescription.dataset.bulkDescription = "true";
  bulkDescription.setAttribute("aria-label", "Description for selected photo(s)");
  const applyDescription = actionButton(
    "Apply description to selected",
    "apply-bulk-description"
  );
  applyDescription.disabled = options.selectedDescriptionFilenames.length === 0;
  unassignedPane.append(bulkDescriptionLabel, bulkDescription, applyDescription);

  if (options.hiddenCount > 0) {
    const showHiddenButton = actionButton(
      options.showHidden
        ? `Hide ${options.hiddenCount} hidden photo(s)`
        : `Show ${options.hiddenCount} hidden photo(s)`,
      "toggle-hidden-list"
    );
    showHiddenButton.setAttribute("aria-pressed", String(options.showHidden));
    unassignedPane.append(showHiddenButton);
  }

  const groupsPane = document.createElement("section");
  groupsPane.className = "groups-pane";
  groupsPane.setAttribute("aria-labelledby", "groups-title");
  const groupsHeading = document.createElement("div");
  groupsHeading.className = "groups-heading";
  const groupsTitle = document.createElement("h2");
  groupsTitle.id = "groups-title";
  groupsTitle.textContent = "3x Post Groups";
  const previewButton = actionButton(
    options.previewGroupId === null
      ? "Preview next ready group"
      : "Cancel preview",
    options.previewGroupId === null ? "start-preview" : "cancel-preview"
  );
  previewButton.disabled =
    options.previewGroupId === null && options.nextReadyGroupId === null;
  previewButton.dataset.groupId = options.nextReadyGroupId ?? "";
  groupsHeading.append(groupsTitle, previewButton);
  const addGroup = actionButton("Add group", "add-group");
  groupsHeading.append(addGroup);
  groupsPane.append(groupsHeading);

  const groupList = document.createElement("div");
  groupList.className = "group-list";
  const placeholder = createEmptyGroup(PLACEHOLDER_GROUP_ID);
  const displayGroups = [
    ...projectGroupsForPreview(options.project, options.previewGroupId),
    placeholder
  ];

  if (options.previewGroupId !== null) {
    const notice = document.createElement("p");
    notice.className = "preview-notice";
    notice.textContent =
      "Preview only: this visual order does not change the project or its saved JSON.";
    groupsPane.append(notice);
  }

  displayGroups.forEach((group, index) => {
    const isPlaceholder = group.id === PLACEHOLDER_GROUP_ID;
    groupList.append(
      renderGroup(
        group,
        index,
        isPlaceholder,
        group.id === options.previewGroupId,
        options
      )
    );
    if (!isPlaceholder && group.publicationStatus !== "published") {
      const insert = actionButton("＋ Insert group here", "insert-group");
      insert.dataset.insertIndex = String(index + 1);
      groupList.append(insert);
    }
  });

  groupsPane.append(groupList);
  layout.append(unassignedPane, groupsPane);
  root.append(layout);
}

function renderUnassignedImage(
  image: ImageEntry,
  index: number,
  count: number,
  options: WorkspaceOptions
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "unassigned-item";

  const select = document.createElement("button");
  select.type = "button";
  select.className = "image-tile";
  select.draggable = true;
  select.dataset.imageFilename = image.filename;
  select.dataset.action = "select-image";
  select.dataset.filename = image.filename;
  select.setAttribute("aria-pressed", String(options.selectedImageFilename === image.filename));
  if (options.selectedImageFilename === image.filename) {
    select.classList.add("selected");
  }

  const imageUrl = options.imageUrlForFilename(image.filename);
  if (imageUrl) {
    const thumbnail = document.createElement("img");
    thumbnail.src = imageUrl;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    select.append(thumbnail);
  }

  const filename = document.createElement("span");
  filename.textContent = image.filename;
  select.append(filename);
  item.append(select);

  const controls = document.createElement("div");
  controls.className = "unassigned-controls";
  const moveUp = actionButton("Up", "move-unassigned-image");
  moveUp.dataset.filename = image.filename;
  moveUp.dataset.direction = "-1";
  moveUp.disabled = index === 0;
  moveUp.setAttribute("aria-label", `Move ${image.filename} up`);
  const moveDown = actionButton("Down", "move-unassigned-image");
  moveDown.dataset.filename = image.filename;
  moveDown.dataset.direction = "1";
  moveDown.disabled = index === count - 1;
  moveDown.setAttribute("aria-label", `Move ${image.filename} down`);
  controls.append(moveUp, moveDown);

  const descriptionSelection = document.createElement("label");
  descriptionSelection.className = "description-selection";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.action = "select-description-image";
  checkbox.dataset.filename = image.filename;
  checkbox.checked = options.selectedDescriptionFilenames.includes(image.filename);
  checkbox.setAttribute("aria-label", `Select ${image.filename} for description editing`);
  const checkboxLabel = document.createElement("span");
  checkboxLabel.textContent = "Description";
  descriptionSelection.append(checkbox, checkboxLabel);
  controls.append(descriptionSelection);

  const hide = actionButton(image.hidden ? "Show" : "Hide", "toggle-hidden");
  hide.dataset.filename = image.filename;
  hide.dataset.hidden = String(!image.hidden);
  hide.setAttribute("aria-label", `${image.hidden ? "Show" : "Hide"} ${image.filename}`);
  controls.append(hide);
  item.append(controls);
  return item;
}

function renderGroup(
  group: GroupEntry,
  index: number,
  placeholder: boolean,
  preview: boolean,
  options: WorkspaceOptions
): HTMLElement {
  const card = document.createElement("article");
  card.className = `group-card${group.publicationStatus === "published" ? " published" : ""}`;
  if (placeholder) {
    card.classList.add("placeholder");
  }
  if (preview) {
    card.classList.add("preview");
  }
  card.dataset.groupCard = "true";
  card.dataset.groupId = group.id;
  card.dataset.placeholder = String(placeholder);
  card.dataset.groupIndex = String(index);

  const isPublished = group.publicationStatus === "published";
  const isSelected = options.selection?.kind === "group" && options.selection.groupId === group.id;
  const groupLabel = placeholder ? "New group placeholder" : `Group ${index + 1}`;
  card.setAttribute(
    "aria-label",
    isSelected ? `Selected ${groupLabel}` : groupLabel
  );
  if (isSelected) {
    card.classList.add("selected");
  }

  const header = document.createElement("div");
  header.className = "group-header";
  const title = document.createElement("h3");
  title.textContent = placeholder ? "New group" : `Group ${index + 1}`;
  const status = document.createElement("span");
  status.className = "group-status";
  status.textContent = placeholder
    ? "Placeholder · not saved until used"
    : preview
      ? "Preview · next published"
      : group.publicationStatus;
  header.append(title, status);
  if (isSelected) {
    header.append(selectionIndicator("Selected group"));
  }

  if (!placeholder) {
    const controls = document.createElement("div");
    controls.className = "group-controls";
    const dragHandle = actionButton("Move group", "drag-group");
    dragHandle.draggable = !isPublished;
    dragHandle.dataset.dragGroup = "true";
    dragHandle.dataset.groupId = group.id;
    dragHandle.disabled = isPublished;
    dragHandle.setAttribute("aria-label", `Drag group ${index + 1}`);
    const moveUp = actionButton("Up", "move-group");
    moveUp.dataset.direction = "-1";
    moveUp.disabled = isPublished;
    const moveDown = actionButton("Down", "move-group");
    moveDown.dataset.direction = "1";
    moveDown.disabled = isPublished;
    const remove = actionButton("Delete group", "delete-group");
    remove.disabled = isPublished;
    controls.append(dragHandle, moveUp, moveDown, remove);
    header.append(controls);
  }
  card.append(header);

  const posts = document.createElement("div");
  posts.className = "post-slots";
  group.posts.forEach((post, postIndex) => {
    posts.append(renderPost(group, post, postIndex, placeholder, isPublished, options));
  });
  card.append(posts);
  return card;
}

function renderPost(
  group: GroupEntry,
  post: PostEntry,
  postIndex: number,
  placeholder: boolean,
  published: boolean,
  options: WorkspaceOptions
): HTMLElement {
  const card = document.createElement("section");
  card.className = "post-card";
  card.dataset.postCard = "true";
  card.dataset.groupId = group.id;
  card.dataset.postIndex = String(postIndex);
  card.dataset.placeholder = String(placeholder);
  const selected =
    options.selection?.kind === "post" &&
    options.selection.groupId === group.id &&
    options.selection.postIndex === postIndex;
  if (selected) {
    card.classList.add("selected");
  }
  card.setAttribute(
    "aria-label",
    selected ? `Selected post slot ${postIndex + 1}` : `Post slot ${postIndex + 1}`
  );

  const heading = document.createElement("div");
  heading.className = "post-heading";
  const title = document.createElement("h4");
  title.textContent = `Post ${postIndex + 1}`;
  heading.append(title);
  if (selected) {
    heading.append(selectionIndicator("Selected post"));
  }
  if (!placeholder) {
    const handle = actionButton("Move post", "drag-post");
    handle.draggable = !published && post.images.length > 0;
    handle.disabled = published || post.images.length === 0;
    handle.dataset.dragPost = "true";
    handle.dataset.groupId = group.id;
    handle.dataset.postIndex = String(postIndex);
    handle.setAttribute("aria-label", `Drag post ${postIndex + 1}`);
    const up = actionButton("Up", "move-post");
    up.dataset.direction = "-1";
    up.disabled = published || postIndex === 0;
    const down = actionButton("Down", "move-post");
    down.dataset.direction = "1";
    down.disabled = published || postIndex === 2;
    heading.append(handle, up, down);
  }
  card.append(heading);

  if (post.images.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Drop or assign an image here.";
    card.append(empty);
  } else {
    const carousel = document.createElement("ol");
    carousel.className = "carousel-list";
    post.images.forEach((filename, imageIndex) => {
      carousel.append(
        renderCarouselItem(filename, group, postIndex, imageIndex, published, options)
      );
    });
    card.append(carousel);
  }

  if (!placeholder) {
    const effectiveLimit =
      post.hashtagLimitOverride ?? options.defaultHashtagLimit;
    card.append(
      renderCaptionEditor(group, post, postIndex, published, effectiveLimit)
    );
  }

  const assign = actionButton(
    options.selectedImageFilename ? "Assign selected image" : "Select an image first",
    "assign-image"
  );
  assign.disabled = published || options.selectedImageFilename === null;
  assign.dataset.groupId = group.id;
  assign.dataset.postIndex = String(postIndex);
  card.append(assign);
  return card;
}

function selectionIndicator(label: string): HTMLElement {
  const indicator = document.createElement("span");
  indicator.className = "selection-indicator";
  indicator.textContent = label;
  return indicator;
}

function renderCaptionEditor(
  group: GroupEntry,
  post: PostEntry,
  postIndex: number,
  published: boolean,
  effectiveLimit: number
): HTMLElement {
  const editor = document.createElement("div");
  editor.className = "caption-editor";

  if (!published) {
    const descriptionLabel = document.createElement("label");
    descriptionLabel.textContent = "Description";
    const description = document.createElement("textarea");
    description.rows = 3;
    description.value = post.description;
    description.dataset.postDescription = "true";
    descriptionLabel.append(description);

    const hashtagsLabel = document.createElement("label");
    hashtagsLabel.textContent = "Hashtags (one per line)";
    const hashtags = document.createElement("textarea");
    hashtags.rows = 3;
    hashtags.value = post.hashtags.join("\n");
    hashtags.dataset.postHashtags = "true";
    hashtagsLabel.append(hashtags);

    const save = actionButton("Save caption", "save-post-content");
    save.dataset.groupId = group.id;
    save.dataset.postIndex = String(postIndex);
    editor.append(descriptionLabel, hashtagsLabel, save);

    const limitLabel = document.createElement("label");
    limitLabel.textContent = "Hashtag limit override (blank uses project default)";
    const limitInput = document.createElement("input");
    limitInput.type = "number";
    limitInput.min = "0";
    limitInput.step = "1";
    limitInput.value =
      post.hashtagLimitOverride === null ? "" : String(post.hashtagLimitOverride);
    limitInput.dataset.action = "set-post-limit";
    limitInput.dataset.groupId = group.id;
    limitInput.dataset.postIndex = String(postIndex);
    limitLabel.append(limitInput);
    editor.append(limitLabel);
  }

  const count = document.createElement("p");
  count.className =
    post.hashtags.length > effectiveLimit ? "hashtag-count over-limit" : "hashtag-count";
  count.textContent = `${post.hashtags.length} / ${effectiveLimit} hashtags`;
  if (post.hashtags.length > effectiveLimit) {
    const warning = document.createElement("span");
    warning.className = "hashtag-warning";
    warning.textContent = "Limit exceeded. Hashtags were not removed.";
    count.append(" ", warning);
  }

  const captionLabel = document.createElement("h5");
  captionLabel.textContent = "Saved caption preview";
  const caption = document.createElement("pre");
  caption.className = "caption-preview";
  caption.textContent = formatCaption(post.description, post.hashtags);
  editor.append(count, captionLabel, caption);
  return editor;
}

function renderCarouselItem(
  filename: string,
  group: GroupEntry,
  postIndex: number,
  imageIndex: number,
  published: boolean,
  options: WorkspaceOptions
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "carousel-item";
  item.dataset.carouselItem = "true";
  item.dataset.groupId = group.id;
  item.dataset.postIndex = String(postIndex);
  item.dataset.imageIndex = String(imageIndex);
  item.draggable = !published;

  const imageUrl = options.imageUrlForFilename(filename);
  if (imageUrl) {
    const thumbnail = document.createElement("img");
    thumbnail.src = imageUrl;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    item.append(thumbnail);
  }

  const label = document.createElement("span");
  label.textContent = filename;
  item.append(label);
  if (!published) {
    const up = actionButton("Up", "move-carousel-image");
    up.dataset.direction = "-1";
    up.dataset.imageIndex = String(imageIndex);
    up.dataset.groupId = group.id;
    up.dataset.postIndex = String(postIndex);
    up.disabled = imageIndex === 0;
    const down = actionButton("Down", "move-carousel-image");
    down.dataset.direction = "1";
    down.dataset.imageIndex = String(imageIndex);
    down.dataset.groupId = group.id;
    down.dataset.postIndex = String(postIndex);
    down.disabled = imageIndex === group.posts[postIndex].images.length - 1;
    const remove = actionButton("Remove", "remove-image");
    remove.dataset.imageIndex = String(imageIndex);
    remove.dataset.groupId = group.id;
    remove.dataset.postIndex = String(postIndex);
    item.append(up, down, remove);
  }
  return item;
}

function runButtonAction(button: HTMLButtonElement, actions: WorkspaceActions): void {
  const groupId = button.dataset.groupId ?? "";
  const postIndex = Number(button.dataset.postIndex);
  const direction = Number(button.dataset.direction) as -1 | 1;

  switch (button.dataset.action) {
    case "select-image":
      actions.onSelectImage(button.dataset.filename ?? "");
      break;
    case "toggle-hidden":
      actions.onToggleHidden(
        button.dataset.filename ?? "",
        button.dataset.hidden === "true"
      );
      break;
    case "move-unassigned-image":
      actions.onMoveUnassignedImage(button.dataset.filename ?? "", direction);
      break;
    case "toggle-hidden-list":
      actions.onToggleShowHidden();
      break;
    case "apply-bulk-description":
      actions.onApplyBulkDescription();
      break;
    case "add-group":
      actions.onAddGroup();
      break;
    case "start-preview":
      actions.onStartPreview(groupId);
      break;
    case "cancel-preview":
      actions.onCancelPreview();
      break;
    case "insert-group":
      actions.onInsertGroup(Number(button.dataset.insertIndex));
      break;
    case "move-group":
      actions.onMoveGroup(groupId, direction);
      break;
    case "move-post":
      actions.onMovePost(groupId, postIndex, direction);
      break;
    case "move-carousel-image":
      actions.onMoveCarouselImage(
        groupId,
        postIndex,
        Number(button.dataset.imageIndex),
        direction
      );
      break;
    case "remove-image":
      actions.onRemoveImage(
        groupId,
        postIndex,
        Number(button.dataset.imageIndex)
      );
      break;
    case "delete-group":
      actions.onDeleteGroup(groupId);
      break;
    case "save-post-content": {
      const card = button.closest<HTMLElement>("[data-post-card]");
      const description = card?.querySelector<HTMLTextAreaElement>(
        "[data-post-description]"
      );
      const hashtags = card?.querySelector<HTMLTextAreaElement>(
        "[data-post-hashtags]"
      );
      if (description && hashtags) {
        actions.onUpdatePost(
          groupId,
          postIndex,
          description.value,
          hashtags.value.split(/\r?\n/)
        );
      }
      break;
    }
  }

  if (button.dataset.action === "assign-image") {
    const filename = button.closest<HTMLElement>(".workspace")?.dataset.selectedImage;
    if (filename) {
      actions.onAssignImage(filename, groupId, postIndex);
    }
  }
}

function handlePostDrop(
  transfer: DataTransfer,
  targetPost: HTMLElement,
  targetCarouselItem: HTMLElement | null,
  actions: WorkspaceActions
): void {
  const targetGroupId = targetPost.dataset.groupId ?? "";
  const targetPostIndex = Number(targetPost.dataset.postIndex);
  const filename = transfer.getData(IMAGE_TRANSFER_TYPE);
  if (filename) {
    actions.onAssignImage(filename, targetGroupId, targetPostIndex);
    return;
  }

  const postData = transfer.getData(POST_TRANSFER_TYPE);
  if (postData) {
    const [sourceGroupId, sourceIndex] = postData.split("\n");
    actions.onMovePostToSlot(
      sourceGroupId,
      Number(sourceIndex),
      targetGroupId,
      targetPostIndex
    );
    return;
  }

  const carouselData = transfer.getData(CAROUSEL_TRANSFER_TYPE);
  if (!carouselData) {
    return;
  }

  const [sourceGroupId, sourcePostIndex, sourceImageIndex] = carouselData.split("\n");
  if (sourceGroupId !== targetGroupId || Number(sourcePostIndex) !== targetPostIndex) {
    return;
  }

  const destinationImageIndex = targetCarouselItem
    ? Number(targetCarouselItem.dataset.imageIndex)
    : Number.MAX_SAFE_INTEGER;
  actions.onMoveCarouselToIndex(
    sourceGroupId,
    targetPostIndex,
    Number(sourceImageIndex),
    destinationImageIndex
  );
}

function handleGroupDrop(
  event: DragEvent,
  transfer: DataTransfer,
  targetGroup: HTMLElement,
  actions: WorkspaceActions
): void {
  const sourceGroupId = transfer.getData(GROUP_TRANSFER_TYPE);
  if (!sourceGroupId) {
    return;
  }

  const targetGroupId = targetGroup.dataset.groupId ?? "";
  const bounds = targetGroup.getBoundingClientRect();
  const insertAfter = event.clientY > bounds.top + bounds.height / 2;
  actions.onMoveGroupToIndex(
    sourceGroupId,
    Number(targetGroup.dataset.groupIndex) + (insertAfter ? 1 : 0)
  );
}

function isDropTarget(target: Element): boolean {
  return (
    target.closest("[data-post-card]") !== null ||
    target.closest("[data-group-card]") !== null ||
    target.closest("[data-image-filename]") !== null
  );
}

function actionButton(label: string, action: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  return button;
}
