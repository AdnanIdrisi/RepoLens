export interface SourceMetadata {
  contentHash: string;
  sizeBytes: number;
  lineCount: number;
}

export interface SourceStore {
  /**
   * Retrieves source file content by repository ID, commit SHA, and repository-relative path.
   */
  getFile(
    repositoryId: string,
    commitSha: string,
    path: string
  ): Promise<string | null>;

  /**
   * Retrieves file metadata (hash, size, line count) without returning full content.
   */
  getFileMetadata(
    repositoryId: string,
    commitSha: string,
    path: string
  ): Promise<SourceMetadata | null>;

  /**
   * Persists or caches a source file for a repository revision.
   */
  saveFile(
    repositoryId: string,
    commitSha: string,
    path: string,
    content: string
  ): Promise<SourceMetadata>;

  /**
   * Checks whether a source file is currently available in storage.
   */
  hasFile(
    repositoryId: string,
    commitSha: string,
    path: string
  ): Promise<boolean>;
}
