import { describe, it, expect } from "vitest";
import { MockEmbeddingProvider } from "./mock-embedding.provider.js";
import { GeminiEmbeddingProvider } from "./gemini-embedding.provider.js";

describe("Embedding Providers", () => {
  it("MockEmbeddingProvider generates deterministic 768-dim normalized vectors", async () => {
    const provider = new MockEmbeddingProvider();
    expect(provider.dimensions).toBe(768);

    const vec1 = await provider.embedQuery("function authenticateUser(req, res)");
    const vec2 = await provider.embedQuery("function authenticateUser(req, res)");
    const vecDiff = await provider.embedQuery("database connection string postgres");

    expect(vec1).toHaveLength(768);
    expect(vec1).toEqual(vec2); // Deterministic
    expect(vec1).not.toEqual(vecDiff);

    // Verify L2 norm is ~1.0
    const norm = Math.sqrt(vec1.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 2);
  });

  it("MockEmbeddingProvider supports batch documents", async () => {
    const provider = new MockEmbeddingProvider();
    const batch = ["test one", "test two", "test three"];
    const vectors = await provider.embedDocuments(batch);

    expect(vectors).toHaveLength(3);
    expect(vectors[0]).toHaveLength(768);
    expect(vectors[1]).toHaveLength(768);
    expect(vectors[2]).toHaveLength(768);
  });

  it("GeminiEmbeddingProvider gracefully falls back to deterministic mock when unconfigured", async () => {
    const provider = new GeminiEmbeddingProvider({ apiKey: "" });
    const vec = await provider.embedQuery("function testGracefulFallback()");

    expect(vec).toHaveLength(768);
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 2);
  });
});
