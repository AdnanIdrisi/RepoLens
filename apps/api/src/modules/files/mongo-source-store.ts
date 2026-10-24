import { SourceStore, SourceMetadata } from "./source-store.interface.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { GitHubClient } from "../repositories/github.client.js";
import { computeContentHash } from "./hasher.js";
import { normalizeRepositoryPath } from "./path-normalizer.js";

export class MongoSourceStore implements SourceStore {
  private githubClient: GitHubClient;

  constructor(githubClient?: GitHubClient) {
    this.githubClient = githubClient || new GitHubClient();
  }

  public async getFile(
    repositoryId: string,
    commitSha: string,
    rawPath: string
  ): Promise<string | null> {
    const filePath = normalizeRepositoryPath(rawPath);

    const doc = await CodeFileModel.findOne({
      repositoryId,
      commitSha,
      path: filePath
    });

    if (!doc) {
      return null;
    }

    // If source content is already cached in database, return it
    if (doc.content !== undefined && doc.content !== null) {
      return doc.content;
    }

    // If we have a blobSha, fetch the blob from GitHub on-demand and cache it
    if (doc.blobSha) {
      const repo = await RepositoryModel.findById(repositoryId);
      if (repo) {
        try {
          const content = await this.githubClient.getBlobContent(
            repo.owner,
            repo.name,
            doc.blobSha
          );

          const meta = computeContentHash(content);
          doc.content = content;
          doc.contentHash = meta.contentHash;
          doc.sizeBytes = meta.sizeBytes;
          doc.lineCount = meta.lineCount;
          doc.status = "fetched";
          await doc.save();

          return content;
        } catch (fetchErr) {
          console.error(`[SourceStore] Failed to fetch blob ${doc.blobSha} for ${filePath}:`, fetchErr);
        }
      }
    }

    return null;
  }

  public async getFileMetadata(
    repositoryId: string,
    commitSha: string,
    rawPath: string
  ): Promise<SourceMetadata | null> {
    const filePath = normalizeRepositoryPath(rawPath);

    const doc = await CodeFileModel.findOne({
      repositoryId,
      commitSha,
      path: filePath
    });

    if (!doc) {
      return null;
    }

    if (doc.contentHash && doc.lineCount !== undefined) {
      return {
        contentHash: doc.contentHash,
        sizeBytes: doc.sizeBytes,
        lineCount: doc.lineCount
      };
    }

    // If not hashed yet, trigger getFile to compute and store
    const content = await this.getFile(repositoryId, commitSha, filePath);
    if (content === null) {
      return null;
    }

    return computeContentHash(content);
  }

  public async saveFile(
    repositoryId: string,
    commitSha: string,
    rawPath: string,
    content: string
  ): Promise<SourceMetadata> {
    const filePath = normalizeRepositoryPath(rawPath);
    const meta = computeContentHash(content);

    await CodeFileModel.findOneAndUpdate(
      { repositoryId, commitSha, path: filePath },
      {
        $set: {
          repositoryId,
          commitSha,
          path: filePath,
          content,
          contentHash: meta.contentHash,
          sizeBytes: meta.sizeBytes,
          lineCount: meta.lineCount,
          status: "fetched"
        }
      },
      { upsert: true, new: true }
    );

    return meta;
  }

  public async hasFile(
    repositoryId: string,
    commitSha: string,
    rawPath: string
  ): Promise<boolean> {
    const filePath = normalizeRepositoryPath(rawPath);
    const count = await CodeFileModel.countDocuments({
      repositoryId,
      commitSha,
      path: filePath
    });
    return count > 0;
  }
}
