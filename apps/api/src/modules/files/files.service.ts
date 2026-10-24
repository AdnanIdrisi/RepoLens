import { SourceStore } from "./source-store.interface.js";
import { MongoSourceStore } from "./mongo-source-store.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { normalizeRepositoryPath } from "./path-normalizer.js";
import { ApiError } from "../../middleware/error.middleware.js";

export interface FileViewResult {
  repositoryId: string;
  commitSha: string;
  path: string;
  content: string;
  contentHash: string;
  sizeBytes: number;
  totalLines: number;
  startLine: number;
  endLine: number;
}

export class FilesService {
  private sourceStore: SourceStore;

  constructor(sourceStore?: SourceStore) {
    this.sourceStore = sourceStore || new MongoSourceStore();
  }

  /**
   * Retrieves file source code and metadata, supporting bounded line range slicing.
   */
  public async getFileContent(
    repositoryId: string,
    rawPath: string,
    options: { startLine?: number; endLine?: number } = {}
  ): Promise<FileViewResult> {
    const normalizedPath = normalizeRepositoryPath(rawPath);

    const repository = await RepositoryModel.findById(repositoryId);
    if (!repository) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repository.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    const content = await this.sourceStore.getFile(repositoryId, commitSha, normalizedPath);
    if (content === null) {
      throw new ApiError(404, "FILE_NOT_FOUND", `File '${normalizedPath}' not found for repository revision`);
    }

    const metadata = await this.sourceStore.getFileMetadata(repositoryId, commitSha, normalizedPath);
    const lines = content.split(/\r\n|\r|\n/);
    const totalLines = lines.length;

    let startLine = options.startLine ? Math.max(1, options.startLine) : 1;
    let endLine = options.endLine ? Math.min(totalLines, options.endLine) : totalLines;

    if (startLine > totalLines) {
      startLine = totalLines;
    }
    if (endLine < startLine) {
      endLine = startLine;
    }

    // Slice bounded lines (1-indexed inclusive)
    const slicedContent = lines.slice(startLine - 1, endLine).join("\n");

    return {
      repositoryId,
      commitSha,
      path: normalizedPath,
      content: slicedContent,
      contentHash: metadata?.contentHash || "",
      sizeBytes: metadata?.sizeBytes || Buffer.byteLength(content, "utf8"),
      totalLines,
      startLine,
      endLine
    };
  }
}
