import { describe, it, expect } from "vitest";
import { GRAPH_ENGINE_VERSION } from "./index.js";

describe("Graph Engine Package", () => {
  it("exports package version", () => {
    expect(GRAPH_ENGINE_VERSION).toBe("0.1.0");
  });
});
