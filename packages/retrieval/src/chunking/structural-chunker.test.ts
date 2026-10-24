import { describe, it, expect } from "vitest";
import { StructuralChunker } from "./structural-chunker.js";
import type { FileAnalysisResult } from "@repolens/code-analyzer";

describe("StructuralChunker", () => {
  const chunker = new StructuralChunker();

  it("chunks AST symbols preserving line ranges, symbol IDs, and hashes", () => {
    const code = [
      "import express from 'express';",
      "",
      "export function calculateSum(a: number, b: number): number {",
      "  return a + b;",
      "}",
      "",
      "export function multiply(a: number, b: number): number {",
      "  return a * b;",
      "}"
    ].join("\n");

    const analysis: FileAnalysisResult = {
      filePath: "src/math.ts",
      language: "typescript",
      lineCount: 9,
      symbols: [
        {
          repositoryId: "repo-1",
          commitSha: "sha-abc",
          symbolId: "src/math.ts#function::calculateSum:3",
          name: "calculateSum",
          kind: "function",
          filePath: "src/math.ts",
          startLine: 3,
          endLine: 5,
          exported: true
        },
        {
          repositoryId: "repo-1",
          commitSha: "sha-abc",
          symbolId: "src/math.ts#function::multiply:7",
          name: "multiply",
          kind: "function",
          filePath: "src/math.ts",
          startLine: 7,
          endLine: 9,
          exported: true
        }
      ],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      calls: [],
      routes: [],
      diagnostics: []
    };

    const chunks = chunker.chunkFile(analysis, code, "repo-1", "sha-abc");

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const sumChunk = chunks.find((c) => c.symbolId?.includes("calculateSum"));
    expect(sumChunk).toBeDefined();
    expect(sumChunk?.startLine).toBe(3);
    expect(sumChunk?.endLine).toBe(5);
    expect(sumChunk?.text).toContain("return a + b;");
    expect(sumChunk?.contentHash).toHaveLength(64);
    expect(sumChunk?.chunkerVersion).toBe("1.0.0");
  });

  it("chunks files with no symbols into bounded line windows", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `const x_${i} = ${i};`);
    const code = lines.join("\n");

    const analysis: FileAnalysisResult = {
      filePath: "src/constants.ts",
      language: "typescript",
      lineCount: 50,
      symbols: [],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      calls: [],
      routes: [],
      diagnostics: []
    };

    const chunks = chunker.chunkFile(analysis, code, "repo-1", "sha-abc", {
      maxChunkLines: 20
    });

    expect(chunks.length).toBe(3);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(20);
    expect(chunks[1].startLine).toBe(21);
    expect(chunks[1].endLine).toBe(40);
    expect(chunks[2].startLine).toBe(41);
    expect(chunks[2].endLine).toBe(50);
  });

  it("sub-chunks large functions exceeding maxChunkLines", () => {
    const lines = ["function bigFunction() {"];
    for (let i = 0; i < 40; i++) {
      lines.push(`  console.log("line ${i}");`);
    }
    lines.push("}");
    const code = lines.join("\n");

    const analysis: FileAnalysisResult = {
      filePath: "src/big.ts",
      language: "typescript",
      lineCount: lines.length,
      symbols: [
        {
          repositoryId: "repo-1",
          commitSha: "sha-abc",
          symbolId: "src/big.ts#function::bigFunction:1",
          name: "bigFunction",
          kind: "function",
          filePath: "src/big.ts",
          startLine: 1,
          endLine: lines.length,
          exported: false
        }
      ],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      calls: [],
      routes: [],
      diagnostics: []
    };

    const chunks = chunker.chunkFile(analysis, code, "repo-1", "sha-abc", {
      maxChunkLines: 20
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.symbolId?.includes("bigFunction"))).toBe(true);
  });
});
