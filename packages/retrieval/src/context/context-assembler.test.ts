import { describe, it, expect } from "vitest";
import { ContextAssembler } from "./context-assembler.js";
import type { CodeEntity } from "@repolens/shared";

describe("ContextAssembler", () => {
  const dummyEntity1: CodeEntity = {
    repositoryId: "repo1",
    commitSha: "sha1",
    entityId: "e1",
    filePath: "src/auth/auth.ts",
    entityType: "function",
    entityName: "verifyToken",
    startLine: 10,
    endLine: 25,
    imports: [],
    calls: [],
    code: "function verifyToken() { return true; }",
    contentHash: "hash1"
  };

  const dummyEntity2: CodeEntity = {
    repositoryId: "repo1",
    commitSha: "sha1",
    entityId: "e2",
    filePath: "src/routes/auth.routes.ts",
    entityType: "route",
    entityName: "POST /login",
    startLine: 1,
    endLine: 15,
    imports: [],
    calls: ["verifyToken"],
    code: "router.post('/login', verifyToken);",
    contentHash: "hash2"
  };

  it("assembles context with clear citations and file ranges", () => {
    const assembled = ContextAssembler.assemble(
      [
        {
          entity: dummyEntity1,
          finalScore: 8.5,
          bm25Score: 5.5,
          symbolBonus: 3.0,
          pathBonus: 0,
          typeBonus: 0,
          matchReasons: ['Exact symbol match: "verifyToken"']
        }
      ],
      [
        {
          entity: dummyEntity2,
          isPrimarySeed: false,
          relation: "CALLS",
          sourceSeedName: "POST /login",
          hopDistance: 1
        }
      ]
    );

    expect(assembled.formattedContext).toContain("[EVIDENCE 1]");
    expect(assembled.formattedContext).toContain("File: src/auth/auth.ts (Lines 10-25)");
    expect(assembled.formattedContext).toContain("verifyToken");
    expect(assembled.citations.length).toBe(2);
    expect(assembled.citations[0].filePath).toBe("src/auth/auth.ts");
    expect(assembled.citations[0].startLine).toBe(10);
    expect(assembled.citations[0].endLine).toBe(25);
  });

  it("respects character budget and cuts off gracefully", () => {
    const assembled = ContextAssembler.assemble(
      [
        {
          entity: dummyEntity1,
          finalScore: 8.5,
          bm25Score: 5.5,
          symbolBonus: 3.0,
          pathBonus: 0,
          typeBonus: 0,
          matchReasons: []
        },
        {
          entity: dummyEntity2,
          finalScore: 6.0,
          bm25Score: 4.0,
          symbolBonus: 2.0,
          pathBonus: 0,
          typeBonus: 0,
          matchReasons: []
        }
      ],
      [],
      { maxCharacters: 300 }
    );

    expect(assembled.includedEntitiesCount).toBe(1);
    expect(assembled.totalCharacters).toBeLessThanOrEqual(300);
  });
});
