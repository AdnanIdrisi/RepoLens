import { describe, it, expect } from "vitest";
import { CodeTokenizer } from "./code-tokenizer.js";
import { BM25Engine } from "./bm25.engine.js";

describe("CodeTokenizer", () => {
  it("splits CamelCase and PascalCase identifiers correctly", () => {
    const tokens = CodeTokenizer.tokenize("getUserAuthToken");
    expect(tokens).toContain("getuserauthtoken");
    expect(tokens).toContain("user");
    expect(tokens).toContain("auth");
    expect(tokens).toContain("token");
  });

  it("splits file paths and snake_case correctly", () => {
    const tokens = CodeTokenizer.tokenize("src/controllers/order_processor.ts");
    expect(tokens).toContain("src");
    expect(tokens).toContain("controllers");
    expect(tokens).toContain("order");
    expect(tokens).toContain("processor");
    expect(tokens).toContain("order_processor");
  });
});

describe("BM25Engine", () => {
  it("indexes and retrieves relevant documents based on BM25 score", () => {
    const engine = new BM25Engine();

    engine.addDocuments([
      {
        id: "doc1",
        filePath: "src/auth/auth.middleware.ts",
        entityName: "verifyToken",
        entityType: "middleware",
        startLine: 10,
        endLine: 25,
        content: "export function verifyToken(req, res, next) { const token = req.headers.authorization; if (!token) return res.status(401); }"
      },
      {
        id: "doc2",
        filePath: "src/billing/payment.service.ts",
        entityName: "processPayment",
        entityType: "function",
        startLine: 1,
        endLine: 20,
        content: "export async function processPayment(amount, card) { return stripe.charges.create({ amount, currency: 'usd' }); }"
      },
      {
        id: "doc3",
        filePath: "src/models/user.model.ts",
        entityName: "UserModel",
        entityType: "class",
        startLine: 5,
        endLine: 30,
        content: "export class UserModel { findUserById(id) { return db.users.find({ id }); } }"
      }
    ]);

    const results = engine.search("where is token authorization verified");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe("doc1");
    expect(results[0].document.entityName).toBe("verifyToken");

    const paymentResults = engine.search("stripe charge payment processing");
    expect(paymentResults.length).toBeGreaterThan(0);
    expect(paymentResults[0].document.id).toBe("doc2");
  });
});

