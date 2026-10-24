import { parseGitHubUrl, GitHubClient } from "./github.client.js";
import { filterFile } from "./file-filter.js";
import { RepositoryModel, RepositoryDocument } from "./models/repository.model.js";
import { IndexingJobModel, IndexingJobDocument } from "./models/job.model.js";
import { CodeFileModel } from "./models/code-file.model.js";
import { ApiError } from "../../middleware/error.middleware.js";

export class RepositoryService {
  private githubClient: GitHubClient;

  constructor(githubClient?: GitHubClient) {
    this.githubClient = githubClient || new GitHubClient();
  }

  /**
   * Registers a repository URL and queues an ingestion job.
   */
  public async registerRepository(
    rawUrl: string,
    ref: string = "main",
    ownerId: string = "anonymous"
  ): Promise<{ repository: RepositoryDocument; job: IndexingJobDocument }> {
    const { owner, repo, normalizedUrl } = parseGitHubUrl(rawUrl);

    // Upsert or fetch existing repository record
    let repository = await RepositoryModel.findOne({ ownerId, owner, name: repo });
    if (!repository) {
      repository = await RepositoryModel.create({
        ownerId,
        provider: "github",
        owner,
        name: repo,
        remoteUrl: normalizedUrl,
        defaultBranch: ref || "main",
        selectedRef: ref || "main",
        status: "pending"
      });
    } else {
      repository.status = "pending";
      repository.selectedRef = ref || repository.defaultBranch || "main";
      repository.errorMessage = undefined;
      await repository.save();
    }

    // Create an indexing job
    const job = await IndexingJobModel.create({
      repositoryId: repository._id.toString(),
      status: "queued",
      stage: "validate_repository",
      filesDiscovered: 0,
      filesProcessed: 0,
      retryCount: 0
    });

    // Start ingestion in background
    this.runIngestionJob(job._id.toString()).catch((err) => {
      console.error(`[Ingestion] Unhandled error in job ${job._id}:`, err);
    });

    return { repository, job };
  }

  /**
   * Orchestrates the 5 ingestion stages for a repository.
   */
  public async runIngestionJob(jobId: string): Promise<void> {
    const job = await IndexingJobModel.findById(jobId);
    if (!job) return;

    const repository = await RepositoryModel.findById(job.repositoryId);
    if (!repository) {
      job.status = "failed";
      job.errorMessage = "Associated repository not found";
      await job.save();
      return;
    }

    job.status = "running";
    job.startedAt = new Date();
    await job.save();

    repository.status = "fetching";
    await repository.save();

    try {
      // Stage 1: validate_repository
      job.stage = "validate_repository";
      await job.save();
      const meta = await this.githubClient.getRepository(repository.owner, repository.name);
      if (meta.isPrivate) {
        throw new Error("Repository is private. RepoLens v1 supports public repositories.");
      }
      if (repository.selectedRef === "main" && meta.defaultBranch !== "main") {
        repository.defaultBranch = meta.defaultBranch;
        repository.selectedRef = meta.defaultBranch;
        await repository.save();
      }

      // Stage 2: resolve_commit
      job.stage = "resolve_commit";
      await job.save();
      const targetRef = repository.selectedRef || repository.defaultBranch || "main";
      const commitInfo = await this.githubClient.resolveCommit(
        repository.owner,
        repository.name,
        targetRef
      );

      const commitSha = commitInfo.sha;
      repository.commitSha = commitSha;
      job.commitSha = commitSha;
      await repository.save();
      await job.save();

      // Stage 3: discover_tree
      job.stage = "discover_tree";
      await job.save();
      const treeData = await this.githubClient.getTree(
        repository.owner,
        repository.name,
        commitSha
      );

      if (treeData.truncated) {
        console.warn(`[Ingestion] Git tree for ${repository.owner}/${repository.name} is truncated by GitHub API limits.`);
      }

      // Filter to blobs only (files)
      const blobItems = treeData.tree.filter((item) => item.type === "blob");
      job.filesDiscovered = blobItems.length;
      await job.save();

      // Stage 4: filter_files
      job.stage = "filter_files";
      await job.save();

      const bulkOps: Array<{
        updateOne: {
          filter: { repositoryId: string; commitSha: string; path: string };
          update: {
            $set: {
              repositoryId: string;
              commitSha: string;
              path: string;
              language: string;
              blobSha: string;
              sizeBytes: number;
              status: "discovered" | "excluded";
              exclusionReason?: string;
            };
          };
          upsert: boolean;
        };
      }> = [];
      let includedCount = 0;

      for (const item of blobItems) {
        const filterResult = filterFile(item.path, item.size);
        if (filterResult.isIncluded) {
          includedCount++;
        }

        const fileStatus: "discovered" | "excluded" = filterResult.isIncluded ? "discovered" : "excluded";

        bulkOps.push({
          updateOne: {
            filter: {
              repositoryId: repository._id.toString(),
              commitSha,
              path: item.path
            },
            update: {
              $set: {
                repositoryId: repository._id.toString(),
                commitSha,
                path: item.path,
                language: filterResult.language,
                blobSha: item.sha,
                sizeBytes: item.size || 0,
                status: fileStatus,
                exclusionReason: filterResult.exclusionReason
              }
            },
            upsert: true
          }
        });
      }

      if (bulkOps.length > 0) {
        // Execute bulk write in batches of 500
        const batchSize = 500;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batch = bulkOps.slice(i, i + batchSize);
          await CodeFileModel.bulkWrite(batch as never);
        }
      }

      job.filesProcessed = includedCount;
      job.stage = "discovered";
      job.status = "completed";
      job.completedAt = new Date();
      await job.save();

      repository.status = "discovered";
      await repository.save();
      console.log(`[Ingestion] Completed job ${jobId}: ${blobItems.length} files discovered, ${includedCount} eligible for indexing.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Repository ingestion failed";
      console.error(`[Ingestion Error] Job ${jobId} failed:`, message);

      job.status = "failed";
      job.errorMessage = message;
      job.completedAt = new Date();
      await job.save();

      repository.status = "failed";
      repository.errorMessage = message;
      await repository.save();
    }
  }

  /**
   * Retrieves all repositories for the given owner.
   */
  public async listRepositories(ownerId: string = "anonymous"): Promise<RepositoryDocument[]> {
    return RepositoryModel.find({ ownerId }).sort({ updatedAt: -1 });
  }

  /**
   * Retrieves a single repository by ID.
   */
  public async getRepository(id: string): Promise<RepositoryDocument> {
    const repository = await RepositoryModel.findById(id);
    if (!repository) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }
    return repository;
  }

  /**
   * Retrieves job status and progress.
   */
  public async getJob(jobId: string): Promise<IndexingJobDocument> {
    const job = await IndexingJobModel.findById(jobId);
    if (!job) {
      throw new ApiError(404, "NOT_FOUND", "Indexing job not found");
    }
    return job;
  }

  /**
   * Retrieves paginated files discovered for a repository commit.
   */
  public async getFiles(
    repositoryId: string,
    options: {
      page?: number;
      limit?: number;
      status?: "discovered" | "fetched" | "excluded" | "failed";
      language?: string;
      search?: string;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { repositoryId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.language) {
      query.language = options.language;
    }
    if (options.search) {
      query.path = { $regex: options.search, $options: "i" };
    }

    const [files, totalCount] = await Promise.all([
      CodeFileModel.find(query)
        .select("-content")
        .sort({ path: 1 })
        .skip(skip)
        .limit(limit),
      CodeFileModel.countDocuments(query)
    ]);

    return {
      files,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Cancels a running or queued job.
   */
  public async cancelJob(jobId: string): Promise<IndexingJobDocument> {
    const job = await IndexingJobModel.findById(jobId);
    if (!job) {
      throw new ApiError(404, "NOT_FOUND", "Indexing job not found");
    }

    if (job.status === "completed" || job.status === "failed") {
      throw new ApiError(400, "BAD_REQUEST", `Cannot cancel job with status '${job.status}'`);
    }

    job.status = "cancelled";
    job.completedAt = new Date();
    await job.save();

    await RepositoryModel.findByIdAndUpdate(job.repositoryId, {
      status: "failed",
      errorMessage: "Ingestion job cancelled by user"
    });

    return job;
  }
}
