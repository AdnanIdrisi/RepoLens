export interface EmbeddingProvider {
  readonly modelName: string;
  readonly dimensions: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
