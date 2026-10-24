import { describe, it, expect } from "vitest";
import { parseGitHubUrl } from "./github.client.js";

describe("GitHub URL Parser & Security Validator", () => {
  it("parses standard public repository URLs", () => {
    const result = parseGitHubUrl("https://github.com/expressjs/express");
    expect(result.owner).toBe("expressjs");
    expect(result.repo).toBe("express");
    expect(result.normalizedUrl).toBe("https://github.com/expressjs/express");
  });

  it("handles URLs with trailing slash and .git extension", () => {
    const result = parseGitHubUrl("https://github.com/facebook/react.git/");
    expect(result.owner).toBe("facebook");
    expect(result.repo).toBe("react");
    expect(result.normalizedUrl).toBe("https://github.com/facebook/react");
  });

  it("handles www.github.com subdomain", () => {
    const result = parseGitHubUrl("https://www.github.com/nodejs/node");
    expect(result.owner).toBe("nodejs");
    expect(result.repo).toBe("node");
  });

  it("rejects non-GitHub domains (SSRF protection)", () => {
    expect(() => parseGitHubUrl("https://gitlab.com/owner/repo")).toThrow(
      "Only public GitHub repositories (github.com) are supported"
    );
    expect(() => parseGitHubUrl("https://attacker.com/expressjs/express")).toThrow(
      "Only public GitHub repositories (github.com) are supported"
    );
    expect(() => parseGitHubUrl("http://localhost:3000/owner/repo")).toThrow(
      "Only public GitHub repositories (github.com) are supported"
    );
  });

  it("rejects non-HTTP protocols", () => {
    expect(() => parseGitHubUrl("file:///etc/passwd")).toThrow(
      "Repository URL must use HTTP or HTTPS protocol"
    );
    expect(() => parseGitHubUrl("ftp://github.com/owner/repo")).toThrow(
      "Repository URL must use HTTP or HTTPS protocol"
    );
  });

  it("rejects incomplete paths", () => {
    expect(() => parseGitHubUrl("https://github.com/justowner")).toThrow(
      "URL must contain owner and repository name"
    );
    expect(() => parseGitHubUrl("https://github.com/")).toThrow(
      "URL must contain owner and repository name"
    );
  });

  it("rejects characters outside GitHub identifier specifications", () => {
    expect(() => parseGitHubUrl("https://github.com/owner/repo<script>")).toThrow(
      "GitHub owner and repository names contain invalid characters"
    );
  });
});
