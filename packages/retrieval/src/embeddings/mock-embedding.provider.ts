import crypto from "node:crypto";
import type { EmbeddingProvider } from "./embedding-provider.interface.js";

export class MockEmbeddingProvider implements EmbeddingProvider {
  public readonly modelName = "mock-text-embedding-768";
  public readonly dimensions = 768;

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateDeterministicVector(t));
  }

  public async embedQuery(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text);
  }

  /**
   * Deterministically generates a normalized 768-dimensional float vector
   * using SHA-256 hash seeds and word frequency bag.
   */
  public generateDeterministicVector(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    const normalized = text.toLowerCase().trim();
    const tokens = normalized.split(/\W+/).filter(Boolean);

    // Hash-based projection across the vector dimensions
    for (const token of tokens) {
      const hash = crypto.createHash("sha256").update(token).digest();
      for (let i = 0; i < 32; i++) {
        const byte = hash[i];
        const index = (byte * 23 + i) % this.dimensions;
        vector[index] += 1.0;
      }
    }

    // Baseline non-zero component to prevent zero vector
    const fallbackHash = crypto.createHash("sha256").update(normalized).digest();
    for (let i = 0; i < 16; i++) {
      const idx = (fallbackHash[i] * 17) % this.dimensions;
      vector[idx] += 0.5;
    }

    // L2 normalize
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    for (let i = 0; i < this.dimensions; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }

    return vector;
  }
}
