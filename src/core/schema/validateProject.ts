import type { PublicationStatus, ValidationResult } from "../project/types";
import { isSupportedSchemaVersion } from "./versioning";

const ALLOWED_PUBLICATION_STATUS: PublicationStatus[] = ["ready", "published", "not ready"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function validateProject(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["Project JSON root must be an object."],
      warnings
    };
  }

  if (!isSupportedSchemaVersion(input.schemaVersion)) {
    errors.push("Unsupported or missing schemaVersion. Expected schemaVersion = 1.");
  }

  if (!isRecord(input.project)) {
    errors.push("project must be an object.");
  } else {
    if (!isNonEmptyString(input.project.id)) {
      errors.push("project.id must be a non-empty string.");
    }
    if (!isNonEmptyString(input.project.createdAt)) {
      errors.push("project.createdAt must be a non-empty string.");
    }
    if (!isNonEmptyString(input.project.updatedAt)) {
      errors.push("project.updatedAt must be a non-empty string.");
    }
  }

  if (!isRecord(input.settings)) {
    errors.push("settings must be an object.");
  } else if (!isNonNegativeInteger(input.settings.defaultHashtagLimit)) {
    errors.push("settings.defaultHashtagLimit must be a non-negative integer.");
  }

  if (!isRecord(input.dictionary)) {
    errors.push("dictionary must be an object map.");
  } else {
    for (const [key, value] of Object.entries(input.dictionary)) {
      if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
        errors.push(`dictionary.${key} must be an array of strings.`);
      }
    }
  }

  if (!Array.isArray(input.images)) {
    errors.push("images must be an array.");
  } else {
    for (let i = 0; i < input.images.length; i += 1) {
      const image = input.images[i];
      if (!isRecord(image)) {
        errors.push(`images[${i}] must be an object.`);
        continue;
      }

      if (!isNonEmptyString(image.filename)) {
        errors.push(`images[${i}].filename must be a non-empty string.`);
      }
      if (typeof image.hidden !== "boolean") {
        errors.push(`images[${i}].hidden must be a boolean.`);
      }
      if (!(image.unassignedOrder === null || isNonNegativeInteger(image.unassignedOrder))) {
        errors.push(`images[${i}].unassignedOrder must be null or a non-negative integer.`);
      }
      if (typeof image.description !== "string") {
        errors.push(`images[${i}].description must be a string.`);
      }
    }
  }

  if (!Array.isArray(input.groups)) {
    errors.push("groups must be an array.");
  } else {
    for (let i = 0; i < input.groups.length; i += 1) {
      const group = input.groups[i];
      if (!isRecord(group)) {
        errors.push(`groups[${i}] must be an object.`);
        continue;
      }

      if (!isNonEmptyString(group.id)) {
        errors.push(`groups[${i}].id must be a non-empty string.`);
      }
      if (typeof group.publishedAt !== "string" && group.publishedAt !== null) {
        errors.push(`groups[${i}].publishedAt must be a string or null.`);
      }
      if (typeof group.publicationStatus !== "string" || !ALLOWED_PUBLICATION_STATUS.includes(group.publicationStatus as PublicationStatus)) {
        errors.push(`groups[${i}].publicationStatus must be one of: ready, published, not ready.`);
      }

      if (!Array.isArray(group.posts) || group.posts.length !== 3) {
        errors.push(`groups[${i}].posts must be an array with exactly three posts.`);
        continue;
      }

      for (let j = 0; j < group.posts.length; j += 1) {
        const post = group.posts[j];
        if (!isRecord(post)) {
          errors.push(`groups[${i}].posts[${j}] must be an object.`);
          continue;
        }

        if (!isNonEmptyString(post.id)) {
          errors.push(`groups[${i}].posts[${j}].id must be a non-empty string.`);
        }
        if (!Array.isArray(post.images) || post.images.some((img) => typeof img !== "string")) {
          errors.push(`groups[${i}].posts[${j}].images must be an array of strings.`);
        }
        if (typeof post.description !== "string") {
          errors.push(`groups[${i}].posts[${j}].description must be a string.`);
        }
        if (!Array.isArray(post.hashtags) || post.hashtags.some((tag) => typeof tag !== "string")) {
          errors.push(`groups[${i}].posts[${j}].hashtags must be an array of strings.`);
        }
        if (!(post.hashtagLimitOverride === null || isNonNegativeInteger(post.hashtagLimitOverride))) {
          errors.push(`groups[${i}].posts[${j}].hashtagLimitOverride must be null or a non-negative integer.`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
