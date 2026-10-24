import path from "node:path";

const CANDIDATE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json"
];

const CANDIDATE_INDEX_FILES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "index.json"
];

/**
 * Attempts to resolve a candidate file path by testing candidate extensions and index files
 * against the known repository file paths.
 */
export function resolveFileWithExtensions(
  candidatePath: string,
  knownFiles: Set<string>
): string | null {
  const normalized = path.posix.normalize(candidatePath);

  // 1. Exact match check
  if (knownFiles.has(normalized)) {
    return normalized;
  }

  // 2. TypeScript ESM rewrite rule: if path ends with .js/.mjs/.cjs, test replacing with .ts/.tsx
  if (normalized.endsWith(".js") || normalized.endsWith(".mjs") || normalized.endsWith(".cjs")) {
    const withoutExt = normalized.slice(0, normalized.lastIndexOf("."));
    if (knownFiles.has(`${withoutExt}.ts`)) return `${withoutExt}.ts`;
    if (knownFiles.has(`${withoutExt}.tsx`)) return `${withoutExt}.tsx`;
  }

  // 3. Test appending candidate extensions
  for (const ext of CANDIDATE_EXTENSIONS) {
    if (ext === "") continue;
    const withExt = `${normalized}${ext}`;
    if (knownFiles.has(withExt)) {
      return withExt;
    }
  }

  // 4. Test directory index files
  for (const indexFile of CANDIDATE_INDEX_FILES) {
    const withIndex = path.posix.join(normalized, indexFile);
    if (knownFiles.has(withIndex)) {
      return withIndex;
    }
  }

  return null;
}
