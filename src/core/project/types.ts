export const SCHEMA_VERSION = 1;
export const DEFAULT_HASHTAG_LIMIT = 4;

export type PublicationStatus = "ready" | "published" | "not ready";

export interface ProjectMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  defaultHashtagLimit: number;
}

export interface ImageEntry {
  filename: string;
  hidden: boolean;
  unassignedOrder: number | null;
  description: string;
}

export interface PostEntry {
  id: string;
  images: string[];
  description: string;
  hashtags: string[];
  hashtagLimitOverride: number | null;
}

export interface GroupEntry {
  id: string;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  posts: [PostEntry, PostEntry, PostEntry];
}

export interface ProjectData {
  schemaVersion: typeof SCHEMA_VERSION;
  project: ProjectMetadata;
  settings: ProjectSettings;
  dictionary: Record<string, string[]>;
  images: ImageEntry[];
  groups: GroupEntry[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportSuccess {
  ok: true;
  project: ProjectData;
  warnings: string[];
}

export interface ImportFailure {
  ok: false;
  errors: string[];
}

export type ImportResult = ImportSuccess | ImportFailure;
