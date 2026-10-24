import { describe, it, expect } from "vitest";
import { RETRIEVAL_VERSION } from "./index.js";

describe("Retrieval Package", () => {
  it("exports package version", () => {
    expect(RETRIEVAL_VERSION).toBe("0.1.0");
  });
});
