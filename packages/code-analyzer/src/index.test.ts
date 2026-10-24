import { describe, it, expect } from "vitest";
import { CODE_ANALYZER_VERSION } from "./index.js";

describe("Code Analyzer Package", () => {
  it("exports package version", () => {
    expect(CODE_ANALYZER_VERSION).toBe("0.1.0");
  });
});
