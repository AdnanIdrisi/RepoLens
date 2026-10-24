import { RepositoryModel } from "./models/repository.model.js";
import { IndexingJobModel } from "./models/job.model.js";
import { CodeFileModel } from "./models/code-file.model.js";
import { GitHubClient } from "./github.client.js";
import { filterFile } from "./file-filter.js";
import { GraphService } from "../graph/graph.service.js";
import { RetrievalService } from "../retrieval/retrieval.service.js";
import { TracingService } from "../tracing/tracing.service.js";
import { ApiError } from "../../middleware/error.middleware.js";

export interface CommitDiffResult {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
  isIncremental: boolean;
}

export class IndexingOrchestrator {
  private githubClient = new GitHubClient();
  private graphService = new GraphService();
  private retrievalService = new RetrievalService();
  private tracingService = new TracingService();

  /**
   * Starts full or incremental pipeline execution for a repository.
   */
  public async startIndexing(repositoryId: string): Promise<string> {
    const repository = await RepositoryModel.findById(repositoryId);
    if (!repository) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const job = new IndexingJobModel({
      repositoryId: repository._id.toString(),
      stage: "validate_repository",
      status: "queued"
    });
    await job.save();

    repository.status = "indexing";
    await repository.save();

    // Launch pipeline execution asynchronously
    this.runPipeline(repository._id.toString(), job._id.toString()).catch((err) => {
      console.error(`[Pipeline Error] Unhandled exception in job ${job._id}:`, err);
    });

    return job._id.toString();
  }

  /**
   * Executes the multi-stage pipeline:
   * validate -> resolve -> discover -> diff/filter -> graph -> chunks/embeddings -> routes -> publish
   */
  public async runPipeline(repositoryId: string, jobId: string): Promise<void> {
    const job = await IndexingJobModel.findById(jobId);
    const repository = await RepositoryModel.findById(repositoryId);
    if (!job || !repository) return;

    try {
      job.status = "running";
      job.startedAt = new Date();
      await job.save();

      // Stage 1 & 2: validate & resolve_commit
      job.stage = "resolve_commit";
      await job.save();
      const targetRef = repository.selectedRef || repository.defaultBranch || "main";
      const commitInfo = await this.githubClient.resolveCommit(
        repository.owner,
        repository.name,
        targetRef
      );

      const headCommitSha = commitInfo.sha;
      const baseCommitSha = repository.activeIndexVersion;
      repository.commitSha = headCommitSha;
      job.commitSha = headCommitSha;
      await repository.save();
      await job.save();

      // Stage 3: discover_tree
      job.stage = "discover_tree";
      await job.save();
      const treeData = await this.githubClient.getTree(
        repository.owner,
        repository.name,
        headCommitSha
      );

      const blobItems = treeData.tree.filter((item) => item.type === "blob");
      job.filesDiscovered = blobItems.length;
      await job.save();

      // Stage 4: compare_commits & incremental difference detection
      const diff = await this.compareCommitTrees(repositoryId, baseCommitSha, blobItems);

      // Filter and upsert code files
      job.stage = "filter_files";
      await job.save();

      const bulkOps = [];
      let includedCount = 0;

      for (const item of blobItems) {
        const filterResult = filterFile(item.path, item.size);
        if (filterResult.isIncluded) includedCount++;

        bulkOps.push({
          updateOne: {
            filter: { repositoryId, commitSha: headCommitSha, path: item.path },
            update: {
              $set: {
                repositoryId,
                commitSha: headCommitSha,
                path: item.path,
                language: filterResult.language,
                blobSha: item.sha,
                sizeBytes: item.size || 0,
                status: filterResult.isIncluded ? "discovered" : "excluded",
                exclusionReason: filterResult.exclusionReason
              }
            },
            upsert: true
          }
        });
      }

      if (bulkOps.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
          await CodeFileModel.bulkWrite(bulkOps.slice(i, i + batchSize) as never);
        }
      }

      job.filesProcessed = includedCount;
      await job.save();

      // Stage 5: build_graph
      job.stage = "build_graph";
      await job.save();
      await this.graphService.indexRepositoryGraph(repositoryId);

      // Stage 6: build_chunks & generate_embeddings
      job.stage = "build_chunks";
      await job.save();
      await this.retrievalService.indexChunks(repositoryId);

      // Stage 7: discover_routes
      await this.tracingService.discoverAndIndexRoutes(repositoryId);

      // Stage 8: validate_index & atomic publication
      job.stage = "publish_index";
      await job.save();

      repository.activeIndexVersion = headCommitSha;
      repository.status = "ready";
      await repository.save();

      job.stage = "completed";
      job.status = "completed";
      job.completedAt = new Date();
      await job.save();

      console.log(
        `[Pipeline] Successfully indexed repository ${repositoryId} at commit ${headCommitSha.slice(0, 8)}. ` +
        `Incremental: ${diff.isIncremental} (Added: ${diff.added.length}, Modified: ${diff.modified.length}, Unchanged: ${diff.unchanged.length}, Deleted: ${diff.deleted.length}).`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pipeline execution failed";
      console.error(`[Pipeline Error] Job ${jobId} failed:`, message);

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
   * Compares the previous active commit tree with the incoming tree
   * to detect incremental file differences.
   */
  public async compareCommitTrees(
    repositoryId: string,
    baseCommitSha: string | undefined,
    incomingBlobs: Array<{ path: string; sha: string }>
  ): Promise<CommitDiffResult> {
    if (!baseCommitSha) {
      return {
        added: incomingBlobs.map((b) => b.path),
        modified: [],
        deleted: [],
        unchanged: [],
        isIncremental: false
      };
    }

    const previousFiles = await CodeFileModel.find({
      repositoryId,
      commitSha: baseCommitSha
    });

    const prevMap = new Map(previousFiles.map((f) => [f.path, f.blobSha]));
    const incomingMap = new Map(incomingBlobs.map((b) => [b.path, b.sha]));

    const added: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];
    const deleted: string[] = [];

    for (const [path, sha] of incomingMap.entries()) {
      if (!prevMap.has(path)) {
        added.push(path);
      } else if (prevMap.get(path) === sha) {
        unchanged.push(path);
      } else {
        modified.push(path);
      }
    }

    for (const path of prevMap.keys()) {
      if (!incomingMap.has(path)) {
        deleted.push(path);
      }
    }

    return {
      added,
      modified,
      deleted,
      unchanged,
      isIncremental: true
    };
  }
}
