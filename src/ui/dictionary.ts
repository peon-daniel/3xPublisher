import type { HashtagDictionary } from "../core/hashtags/generateHashtags";
import {
  generateHashtags,
  parseFilenameIdentifiers
} from "../core/hashtags/generateHashtags";
import type { DictionarySuggestion } from "../core/hashtags/dictionarySuggestions";
import { saveDictionaryRule } from "../core/hashtags/operations";

export interface DictionaryOptions {
  dictionary: HashtagDictionary;
  defaultHashtagLimit: number;
  sampleFilename: string;
  message: string;
  suggestions: DictionarySuggestion[];
  onSaveRule(previousIdentifier: string | null, identifier: string, hashtags: string[]): void;
  onDeleteRule(identifier: string): void;
  onAcceptSuggestion(identifier: string): void;
  onDismissSuggestion(identifier: string): void;
  onSetDefaultLimit(limit: number): void;
  onSampleFilenameChange(filename: string): void;
}

export function renderDictionary(root: HTMLElement, options: DictionaryOptions): void {
  root.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "Hashtag dictionary";
  const introduction = document.createElement("p");
  introduction.className = "help-text";
  introduction.textContent =
    "Dictionary changes affect hashtags generated for future first-image assignments only. Saved post hashtags are not rewritten.";

  const settings = document.createElement("div");
  settings.className = "dictionary-settings";
  const limitLabel = document.createElement("label");
  limitLabel.textContent = "Default hashtag limit";
  const limitInput = document.createElement("input");
  limitInput.type = "number";
  limitInput.min = "0";
  limitInput.step = "1";
  limitInput.required = true;
  limitInput.value = String(options.defaultHashtagLimit);
  limitInput.setAttribute("aria-label", "Default hashtag limit");
  limitInput.addEventListener("change", () => {
    options.onSetDefaultLimit(
      limitInput.value.length === 0 ? Number.NaN : Number(limitInput.value)
    );
  });
  settings.append(limitLabel, limitInput);

  const sample = document.createElement("section");
  sample.className = "dictionary-preview";
  const sampleHeading = document.createElement("h3");
  sampleHeading.textContent = "Filename interpretation preview";
  const sampleLabel = document.createElement("label");
  sampleLabel.textContent = "Sample filename";
  const sampleInput = document.createElement("input");
  sampleInput.type = "text";
  sampleInput.value = options.sampleFilename;
  sampleInput.autocomplete = "off";
  sampleInput.addEventListener("input", () => {
    const identifiers = parseFilenameIdentifiers(sampleInput.value);
    parsedOutput.textContent = identifiers.length > 0
      ? `Identifiers: ${identifiers.join(", ")}`
      : "Identifiers: none";
    generatedOutput.textContent = generateHashtags(sampleInput.value, options.dictionary).join(" ") ||
      "No matching hashtags.";
    options.onSampleFilenameChange(sampleInput.value);
  });
  const parsedOutput = document.createElement("p");
  parsedOutput.className = "dictionary-parsed";
  parsedOutput.textContent = formatIdentifiers(options.sampleFilename);
  const generatedOutput = document.createElement("output");
  generatedOutput.className = "dictionary-generated";
  generatedOutput.textContent =
    generateHashtags(options.sampleFilename, options.dictionary).join(" ") ||
    "No matching hashtags.";
  sample.append(sampleHeading, sampleLabel, sampleInput, parsedOutput, generatedOutput);

  const rulesHeading = document.createElement("h3");
  rulesHeading.textContent = "Rules";
  const rules = document.createElement("div");
  rules.className = "dictionary-rules";
  const identifiers = Object.keys(options.dictionary).sort((left, right) =>
    left.localeCompare(right)
  );
  for (const identifier of identifiers) {
    rules.append(
      renderRule(
        options.dictionary,
        identifier,
        options.dictionary[identifier],
        options.onSaveRule,
        options.onDeleteRule
      )
    );
  }

  const suggestionsHeading = document.createElement("h3");
  suggestionsHeading.textContent = "Suggested rules";
  const suggestions = document.createElement("div");
  suggestions.className = "dictionary-suggestions";
  if (options.suggestions.length === 0) {
    const emptySuggestions = document.createElement("p");
    emptySuggestions.className = "help-text";
    emptySuggestions.textContent = "No new filename or XMP identifiers found.";
    suggestions.append(emptySuggestions);
  } else {
    for (const suggestion of options.suggestions) {
      const item = document.createElement("article");
      item.className = "dictionary-suggestion";
      const label = document.createElement("p");
      const source = suggestion.source === "xmp" ? "XMP subject" : "Filename";
      label.textContent =
        `${suggestion.identifier} → #${suggestion.identifier} · ${source} · ${suggestion.imageCount} image(s)`;
      const accept = document.createElement("button");
      accept.type = "button";
      accept.textContent = "Add rule";
      accept.addEventListener("click", () =>
        options.onAcceptSuggestion(suggestion.identifier)
      );
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", () =>
        options.onDismissSuggestion(suggestion.identifier)
      );
      item.append(label, accept, dismiss);
      suggestions.append(item);
    }
  }

  const addHeading = document.createElement("h3");
  addHeading.textContent = "Add a rule";
  const addRule = renderRule(options.dictionary, null, [], options.onSaveRule, options.onDeleteRule);
  const message = document.createElement("p");
  message.className = "dictionary-message";
  message.setAttribute("role", "status");
  message.textContent = options.message;

  root.append(
    heading,
    introduction,
    settings,
    sample,
    rulesHeading,
    rules,
    suggestionsHeading,
    suggestions,
    addHeading,
    addRule,
    message
  );
}

function renderRule(
  dictionary: HashtagDictionary,
  existingIdentifier: string | null,
  existingHashtags: string[],
  onSaveRule: DictionaryOptions["onSaveRule"],
  onDeleteRule: DictionaryOptions["onDeleteRule"]
): HTMLElement {
  const form = document.createElement("form");
  form.className = "dictionary-rule";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const identifier = identifierInput.value;
    const hashtags = hashtagsInput.value.split(/\r?\n/);
    const result = saveDictionaryRule(
      dictionary,
      existingIdentifier,
      identifier,
      hashtags
    );
    if (result.ok) {
      onSaveRule(existingIdentifier, identifier, hashtags);
    } else {
      error.textContent = result.error;
    }
  });

  const identifierLabel = document.createElement("label");
  identifierLabel.textContent = "Identifier";
  const identifierInput = document.createElement("input");
  identifierInput.type = "text";
  identifierInput.value = existingIdentifier ?? "";
  identifierInput.required = true;
  identifierInput.autocomplete = "off";
  identifierLabel.append(identifierInput);

  const hashtagsLabel = document.createElement("label");
  hashtagsLabel.textContent = "Hashtags (one per line)";
  const hashtagsInput = document.createElement("textarea");
  hashtagsInput.rows = 3;
  hashtagsInput.value = existingHashtags.join("\n");
  hashtagsLabel.append(hashtagsInput);

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = existingIdentifier === null ? "Add rule" : "Save rule";
  const error = document.createElement("p");
  error.className = "dictionary-rule-error";
  error.setAttribute("role", "alert");
  form.append(identifierLabel, hashtagsLabel, save);

  if (existingIdentifier !== null) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete rule";
    remove.addEventListener("click", () => onDeleteRule(existingIdentifier));
    form.append(remove);
  }

  form.append(error);
  return form;
}

function formatIdentifiers(filename: string): string {
  const identifiers = parseFilenameIdentifiers(filename);
  return identifiers.length > 0 ? `Identifiers: ${identifiers.join(", ")}` : "Identifiers: none";
}
