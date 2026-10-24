import { describe, it, expect } from "vitest";
import { RegisterRepositoryInputSchema, RepositorySchema } from "./schemas/index.js";

describe("Shared Schemas", () => {
  it("validates a correct GitHub repository URL", () => {
    const input = { url: "https://github.com/expressjs/express", ref: "master" };
    const parsed = RegisterRepositoryInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.url).toBe("https://github.com/expressjs/express");
      expect(parsed.data.ref).toBe("master");
    }
  });

  it("rejects an invalid repository URL", () => {
    const input = { url: "not-a-url" };
    const parsed = RegisterRepositoryInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("validates a full repository entity", () => {
    const repo = {
      _id: "repo-123",
      ownerId: "user-1",
      provider: "github" as const,
      owner: "expressjs",
      name: "express",
      remoteUrl: "https://github.com/expressjs/express",
      defaultBranch: "main",
      selectedRef: "main",
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const parsed = RepositorySchema.safeParse(repo);
    expect(parsed.success).toBe(true);
  });
});
