import { describe, it, expect, vi, beforeEach } from "vitest";
import { IndexingOrchestrator } from "./indexing.orchestrator.js";
import { CodeFileModel } from "./models/code-file.model.js";

vi.mock("./models/code-file.model.js");
vi.mock("./models/repository.model.js");
vi.mock("./models/job.model.js");

describe("IndexingOrchestrator - Incremental Differencing", () => {
  const orchestrator = new IndexingOrchestrator();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies added, modified, unchanged, and deleted files when comparing commit trees", async () => {
    const baseFiles = [
      { path: "src/unchanged.ts", blobSha: "sha-unchanged" },
      { path: "src/modified.ts", blobSha: "sha-old" },
      { path: "src/deleted.ts", blobSha: "sha-deleted" }
    ];

    vi.mocked(CodeFileModel.find).mockResolvedValueOnce(baseFiles as never);

    const incomingBlobs = [
      { path: "src/unchanged.ts", sha: "sha-unchanged" }, // Matches -> unchanged
      { path: "src/modified.ts", sha: "sha-new" }, // Different sha -> modified
      { path: "src/added.ts", sha: "sha-added" } // Not in base -> added
      // src/deleted.ts not in incoming -> deleted
    ];

    const diff = await orchestrator.compareCommitTrees("repo-1", "base-commit-sha", incomingBlobs);

    expect(diff.isIncremental).toBe(true);
    expect(diff.added).toEqual(["src/added.ts"]);
    expect(diff.modified).toEqual(["src/modified.ts"]);
    expect(diff.unchanged).toEqual(["src/unchanged.ts"]);
    expect(diff.deleted).toEqual(["src/deleted.ts"]);
  });

  it("treats entire tree as added when baseCommitSha is undefined (first index)", async () => {
    const incomingBlobs = [
      { path: "src/a.ts", sha: "sha-a" },
      { path: "src/b.ts", sha: "sha-b" }
    ];

    const diff = await orchestrator.compareCommitTrees("repo-1", undefined, incomingBlobs);

    expect(diff.isIncremental).toBe(false);
    expect(diff.added).toHaveLength(2);
    expect(diff.modified).toHaveLength(0);
    expect(diff.deleted).toHaveLength(0);
  });
});
