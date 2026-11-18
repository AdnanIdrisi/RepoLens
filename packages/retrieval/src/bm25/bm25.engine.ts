import { CodeTokenizer } from "./code-tokenizer.js";

export interface BM25Document {
  id: string;
  filePath: string;
  entityName?: string;
  entityType?: string;
  startLine?: number;
  endLine?: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface BM25SearchResult {
  document: BM25Document;
  score: number;
  matchedTerms: string[];
}

export interface BM25SearchOptions {
  topK?: number;
  k1?: number; // Term frequency saturation parameter (default 1.5)
  b?: number;  // Document length normalization parameter (default 0.75)
  entityType?: string;
  pathPrefix?: string;
}

export class BM25Engine {
  private documents: Map<string, BM25Document> = new Map();
  // Inverted index: term -> Map<docId, frequency>
  private invertedIndex: Map<string, Map<string, number>> = new Map();
  // Document length (token count): docId -> length
  private docLengths: Map<string, number> = new Map();
  // Average document length
  private totalDocLength: number = 0;

  constructor(
    private defaultK1: number = 1.5,
    private defaultB: number = 0.75
  ) {}

  /**
   * Resets the entire index.
   */
  public clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.docLengths.clear();
    this.totalDocLength = 0;
  }

  /**
   * Adds or updates a document in the BM25 index.
   */
  public addDocument(doc: BM25Document): void {
    // If doc already exists, remove it first to preserve statistics
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }

    this.documents.set(doc.id, doc);

    // Build indexing text with weighted parts:
    // entityName and filePath are prioritized in token presence
    const fullText = [
      doc.entityName ? `${doc.entityName} ${doc.entityName}` : "",
      doc.filePath ? `${doc.filePath} ${doc.filePath}` : "",
      doc.content
    ].join(" ");

    const tokens = CodeTokenizer.tokenize(fullText);
    const docLength = tokens.length;
    this.docLengths.set(doc.id, docLength);
    this.totalDocLength += docLength;

    // Calculate term frequencies in this document
    const termFreqs = new Map<string, number>();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    for (const [term, freq] of termFreqs.entries()) {
      let postingList = this.invertedIndex.get(term);
      if (!postingList) {
        postingList = new Map();
        this.invertedIndex.set(term, postingList);
      }
      postingList.set(doc.id, freq);
    }
  }

  /**
   * Bulk adds documents.
   */
  public addDocuments(docs: BM25Document[]): void {
    for (const doc of docs) {
      this.addDocument(doc);
    }
  }

  /**
   * Removes a document from the index.
   */
  public removeDocument(docId: string): void {
    if (!this.documents.has(docId)) return;

    this.documents.delete(docId);
    const length = this.docLengths.get(docId) || 0;
    this.totalDocLength -= length;
    this.docLengths.delete(docId);

    for (const [, postingList] of this.invertedIndex.entries()) {
      postingList.delete(docId);
    }
  }

  public get size(): number {
    return this.documents.size;
  }

  /**
   * Queries the BM25 index using Okapi BM25 scoring with exact symbol match boosts.
   */
  public search(query: string, options: BM25SearchOptions = {}): BM25SearchResult[] {
    const {
      topK = 20,
      k1 = this.defaultK1,
      b = this.defaultB,
      entityType,
      pathPrefix
    } = options;

    const queryTokens = CodeTokenizer.tokenize(query);
    if (queryTokens.length === 0 || this.documents.size === 0) {
      return [];
    }

    const N = this.documents.size;
    const avgdl = this.totalDocLength / Math.max(1, N);

    // docId -> { score, matchedTerms }
    const docScores = new Map<string, { score: number; matchedTerms: Set<string> }>();

    for (const token of queryTokens) {
      const postingList = this.invertedIndex.get(token);
      if (!postingList || postingList.size === 0) continue;

      const nq = postingList.size;
      // Okapi BM25 IDF: ln(1 + (N - n(q) + 0.5) / (n(q) + 0.5))
      const idf = Math.log(1 + (N - nq + 0.5) / (nq + 0.5));

      for (const [docId, freq] of postingList.entries()) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        // Apply filters
        if (entityType && doc.entityType && doc.entityType !== entityType) {
          continue;
        }
        if (pathPrefix && !doc.filePath.startsWith(pathPrefix)) {
          continue;
        }

        const docLen = this.docLengths.get(docId) || avgdl;
        // BM25 term weight
        const numerator = freq * (k1 + 1);
        const denominator = freq + k1 * (1 - b + b * (docLen / Math.max(1, avgdl)));
        const termScore = idf * (numerator / denominator);

        let entry = docScores.get(docId);
        if (!entry) {
          entry = { score: 0, matchedTerms: new Set() };
          docScores.set(docId, entry);
        }
        entry.score += termScore;
        entry.matchedTerms.add(token);
      }
    }

    // Rank and return topK
    const results: BM25SearchResult[] = [];
    for (const [docId, entry] of docScores.entries()) {
      const doc = this.documents.get(docId)!;
      results.push({
        document: doc,
        score: entry.score,
        matchedTerms: Array.from(entry.matchedTerms)
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

