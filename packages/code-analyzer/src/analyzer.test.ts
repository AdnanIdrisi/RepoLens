import { describe, it, expect } from "vitest";
import { CodeAnalyzer } from "./analyzer.js";

describe("CodeAnalyzer & Syntax Extractors", () => {
  const analyzer = new CodeAnalyzer();

  it("extracts Express routes, imports, functions, and calls from JavaScript", () => {
    const code = `
const express = require('express');
const { loginUser } = require('./controllers/auth.js');

const app = express();
app.get('/users', (req, res) => {
  res.json([]);
});
app.post('/login', loginUser);

module.exports = app;
    `;

    const result = analyzer.analyzeFile("src/app.js", code, "repo-1", "sha-1");

    expect(result.language).toBe("javascript");
    expect(result.diagnostics.length).toBe(0);

    // Imports
    expect(result.imports.length).toBe(2);
    expect(result.imports[0].importedSpecifier).toBe("express");
    expect(result.imports[1].importedSpecifier).toBe("./controllers/auth.js");
    expect(result.imports[1].importedNames).toContain("loginUser");

    // Routes
    expect(result.routes.length).toBe(2);
    expect(result.routes[0].httpMethod).toBe("GET");
    expect(result.routes[0].routePath).toBe("/users");
    expect(result.routes[1].httpMethod).toBe("POST");
    expect(result.routes[1].routePath).toBe("/login");
    expect(result.routes[1].handlers).toContain("loginUser");

    // Symbols
    const routeSymbols = result.symbols.filter((s) => s.kind === "route");
    expect(routeSymbols.length).toBe(2);
    expect(routeSymbols[0].symbolId).toContain("src/app.js#route:");
  });

  it("extracts TypeScript classes, methods, and types with scope paths", () => {
    const code = `
export class UserService {
  private count: number = 0;

  constructor() {
    this.count = 1;
  }

  public async findUser(id: string): Promise<string> {
    return "User: " + id;
  }
}
    `;

    const result = analyzer.analyzeFile("src/UserService.ts", code, "repo-1", "sha-1");

    expect(result.language).toBe("typescript");
    expect(result.classes.length).toBe(1);

    const cls = result.classes[0];
    expect(cls.name).toBe("UserService");
    expect(cls.isExported).toBe(true);
    expect(cls.methods.length).toBe(2); // constructor + findUser

    const method = cls.methods.find((m) => m.name === "findUser");
    expect(method).toBeDefined();
    expect(method?.isAsync).toBe(true);
    expect(method?.symbolId).toContain("UserService.findUser");
  });

  it("produces diagnostics for syntax errors without throwing exceptions", () => {
    const brokenCode = `
function broken( {
  const x = ;
  return
    `;

    const result = analyzer.analyzeFile("src/broken.js", brokenCode, "repo-1", "sha-1");

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.diagnostics[0].startLine).toBeGreaterThan(0);
  });

  it("extracts ES modules named and default exports", () => {
    const code = `
import { helper } from './utils.js';

export const API_VERSION = 'v1';

export function calculateTotal(items: number[]): number {
  return items.reduce((acc, curr) => acc + curr, 0);
}

export default calculateTotal;
    `;

    const result = analyzer.analyzeFile("src/calc.ts", code, "repo-1", "sha-1");

    expect(result.exports.length).toBe(3);
    const exportNames = result.exports.map((e) => e.name);
    expect(exportNames).toContain("API_VERSION");
    expect(exportNames).toContain("calculateTotal");
    expect(exportNames).toContain("default");
  });

  it("extracts code entities with accurate line numbers, calls, and content hashes", () => {
    const code = `
import { db } from "./db.js";

export async function processOrder(orderId: string) {
  try {
    const order = await db.findOrder(orderId);
    return order;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

app.post('/api/orders', processOrder);
    `;

    const result = analyzer.analyzeFile("src/orders.ts", code, "repo-1", "sha-1");

    expect(result.entities).toBeDefined();
    expect(result.entities.length).toBeGreaterThan(0);

    const fnEntity = result.entities.find((e) => e.entityName === "processOrder" && e.entityType === "function");
    expect(fnEntity).toBeDefined();
    expect(fnEntity?.filePath).toBe("src/orders.ts");
    expect(fnEntity?.startLine).toBe(4);
    expect(fnEntity?.contentHash).toBeTruthy();
    expect(fnEntity?.calls).toContain("db.findOrder");

    const routeEntity = result.entities.find((e) => e.entityType === "route");
    expect(routeEntity).toBeDefined();
    expect(routeEntity?.entityName).toBe("POST /api/orders");
  });
});
