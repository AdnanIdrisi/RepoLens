import { env } from "../../config/env.js";

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

export interface GitHubRepoMetadata {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  sizeKb: number;
  stars: number;
  forks: number;
  isPrivate: boolean;
  isArchived: boolean;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export class GitHubApiError extends Error {
  public status: number;
  public rateLimitRemaining?: number;
  public rateLimitReset?: number;

  constructor(message: string, status: number, rateLimitRemaining?: number, rateLimitReset?: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.rateLimitRemaining = rateLimitRemaining;
    this.rateLimitReset = rateLimitReset;
  }
}

/**
 * Validates and extracts owner and repository from a public GitHub URL.
 * Protects against SSRF and non-GitHub hosts.
 */
export function parseGitHubUrl(rawUrl: string): ParsedGitHubUrl {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Repository URL must be a non-empty string");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid URL format");
  }

  // Strictly enforce HTTPS and github.com host
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Repository URL must use HTTP or HTTPS protocol");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    throw new Error("Only public GitHub repositories (github.com) are supported");
  }

  // Path format: /owner/repo or /owner/repo.git
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("URL must contain owner and repository name (e.g. https://github.com/owner/repo)");
  }

  const owner = segments[0];
  let repo = segments[1];

  // Strip .git suffix if present
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  // Validate owner and repo names against GitHub naming conventions
  const nameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!nameRegex.test(owner) || !nameRegex.test(repo)) {
    throw new Error("GitHub owner and repository names contain invalid characters");
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`
  };
}

export class GitHubClient {
  private token?: string;
  private baseUrl = "https://api.github.com";

  constructor(token?: string) {
    this.token = token || env.GITHUB_TOKEN || undefined;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoLens-Code-Intelligence",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    if (this.token && this.token.trim().length > 0) {
      headers.Authorization = `Bearer ${this.token.trim()}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders()
    });

    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
      ? parseInt(response.headers.get("x-ratelimit-remaining")!, 10)
      : undefined;
    const rateLimitReset = response.headers.get("x-ratelimit-reset")
      ? parseInt(response.headers.get("x-ratelimit-reset")!, 10)
      : undefined;

    if (!response.ok) {
      let errorMessage = `GitHub API request failed (${response.status} ${response.statusText})`;
      try {
        const errorJson = (await response.json()) as { message?: string };
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // ignore json parse error
      }

      if (response.status === 403 && rateLimitRemaining === 0) {
        errorMessage = "GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env to increase quota.";
      } else if (response.status === 404) {
        errorMessage = "GitHub repository not found or is private.";
      }

      throw new GitHubApiError(errorMessage, response.status, rateLimitRemaining, rateLimitReset);
    }

    return (await response.json()) as T;
  }

  /**
   * Fetches repository metadata and default branch.
   */
  public async getRepository(owner: string, repo: string): Promise<GitHubRepoMetadata> {
    interface RawRepo {
      id: number;
      name: string;
      full_name: string;
      owner: { login: string };
      description: string | null;
      default_branch: string;
      size: number;
      stargazers_count: number;
      forks_count: number;
      private: boolean;
      archived: boolean;
    }

    const data = await this.request<RawRepo>(`/repos/${owner}/${repo}`);
    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: data.owner.login,
      description: data.description,
      defaultBranch: data.default_branch,
      sizeKb: data.size,
      stars: data.stargazers_count,
      forks: data.forks_count,
      isPrivate: data.private,
      isArchived: data.archived
    };
  }

  /**
   * Resolves the exact commit SHA for a given ref (branch, tag, or SHA).
   */
  public async resolveCommit(owner: string, repo: string, ref: string): Promise<GitHubCommitInfo> {
    interface RawCommit {
      sha: string;
      commit: {
        message: string;
        author: {
          name: string;
          date: string;
        };
      };
    }

    const data = await this.request<RawCommit>(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);
    return {
      sha: data.sha,
      message: data.commit.message,
      authorName: data.commit.author.name,
      authorDate: data.commit.author.date
    };
  }

  /**
   * Discovers the repository tree recursively using the Git Trees API.
   */
  public async getTree(owner: string, repo: string, commitSha: string): Promise<GitHubTreeResponse> {
    const data = await this.request<GitHubTreeResponse>(
      `/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`
    );
    return data;
  }

  /**
   * Fetches raw file content by blob SHA or path.
   */
  public async getBlobContent(owner: string, repo: string, blobSha: string): Promise<string> {
    interface RawBlob {
      content: string;
      encoding: string;
      size: number;
    }

    const data = await this.request<RawBlob>(`/repos/${owner}/${repo}/git/blobs/${blobSha}`);
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data.content;
  }
}
