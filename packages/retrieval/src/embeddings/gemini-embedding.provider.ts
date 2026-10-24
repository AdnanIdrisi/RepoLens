import { GoogleGenAI } from "@google/genai";
import type { EmbeddingProvider } from "./embedding-provider.interface.js";
import { MockEmbeddingProvider } from "./mock-embedding.provider.js";

export interface GeminiEmbeddingOptions {
  apiKey?: string;
  modelName?: string;
  dimensions?: number;
  batchSize?: number;
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  public readonly modelName: string;
  public readonly dimensions: number;
  private readonly batchSize: number;
  private client: GoogleGenAI | null = null;
  private fallbackProvider = new MockEmbeddingProvider();

  constructor(options: GeminiEmbeddingOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = options.modelName || "text-embedding-004";
    this.dimensions = options.dimensions || 768;
    this.batchSize = options.batchSize || 10;

    if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      return this.fallbackProvider.embedDocuments(texts);
    }

    if (texts.length === 0) {
      return [];
    }

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      try {
        const batchVectors = await this.embedBatchWithRetry(batch);
        allEmbeddings.push(...batchVectors);
      } catch (err) {
        console.warn(
          `[GeminiEmbeddingProvider] Batch embedding failed, falling back to deterministic local mock for batch ${i}:`,
          err instanceof Error ? err.message : String(err)
        );
        const fallbackVectors = await this.fallbackProvider.embedDocuments(batch);
        allEmbeddings.push(...fallbackVectors);
      }
    }

    return allEmbeddings;
  }

  public async embedQuery(text: string): Promise<number[]> {
    if (!this.client) {
      return this.fallbackProvider.embedQuery(text);
    }

    try {
      const response = await this.client.models.embedContent({
        model: this.modelName,
        contents: [text]
      });

      const values = response.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values.slice(0, this.dimensions);
      }
      return this.fallbackProvider.embedQuery(text);
    } catch (err) {
      console.warn(
        `[GeminiEmbeddingProvider] Query embedding failed, falling back to local deterministic vector:`,
        err instanceof Error ? err.message : String(err)
      );
      return this.fallbackProvider.embedQuery(text);
    }
  }

  private async embedBatchWithRetry(batch: string[], retries = 2): Promise<number[][]> {
    if (!this.client) return this.fallbackProvider.embedDocuments(batch);

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.models.embedContent({
          model: this.modelName,
          contents: batch
        });

        if (response.embeddings && response.embeddings.length > 0) {
          return response.embeddings.map((e) =>
            (e.values || []).slice(0, this.dimensions)
          );
        }

        // If batch format was single, embed individually
        const individualResults: number[][] = [];
        for (const item of batch) {
          const itemRes = await this.client.models.embedContent({
            model: this.modelName,
            contents: [item]
          });
          const vals = itemRes.embeddings?.[0]?.values || [];
          individualResults.push(vals.slice(0, this.dimensions));
        }
        return individualResults;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          // Exponential backoff: 500ms, 1000ms
          await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }
}
