import { describe, it, expect } from "vitest";
import { QueryExpander } from "./query-expander.js";

describe("QueryExpander", () => {
  it("expands authentication & route protection queries", () => {
    const result = QueryExpander.expand("Where does the app prevent unauthorized users from accessing protected routes?");
    expect(result.intents.some((i) => i.category === "AUTHENTICATION_AUTHORIZATION")).toBe(true);
    expect(result.intents.some((i) => i.category === "ROUTES_AND_API_FLOW")).toBe(true);
    expect(result.expandedTerms).toContain("unauthorized");
    expect(result.expandedTerms).toContain("token");
    expect(result.preferredEntityTypes).toContain("middleware");
    expect(result.preferredEntityTypes).toContain("route");
  });

  it("expands database queries", () => {
    const result = QueryExpander.expand("Where are database queries executed and models saved?");
    expect(result.intents.some((i) => i.category === "DATABASE_OPERATIONS")).toBe(true);
    expect(result.expandedTerms).toContain("find");
    expect(result.expandedTerms).toContain("save");
    expect(result.combinedQueryString).toContain("db");
  });

  it("expands payment processing queries", () => {
    const result = QueryExpander.expand("How does the application process a payment from start to finish?");
    expect(result.intents.some((i) => i.category === "PAYMENTS_BILLING")).toBe(true);
    expect(result.expandedTerms).toContain("stripe");
    expect(result.expandedTerms).toContain("charge");
  });
});

