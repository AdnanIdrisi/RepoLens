import path from "node:path";

export interface FilterResult {
  isIncluded: boolean;
  language: string;
  exclusionReason?: string;
}

export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB limit for source files

const EXCLUDED_DIR_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".github",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  ".turbo",
  ".cache",
  ".idea",
  ".vscode",
  "vendor",
  "tmp",
  "temp",
  "bower_components"
]);

const EXCLUDED_EXTENSIONS = new Set([
  // Binaries and compiled
  ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm", ".class", ".pyc",
  // Archives
  ".zip", ".tar", ".gz", ".rar", ".7z", ".tgz",
  // Media
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".mp4", ".mp3", ".wav", ".pdf",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Source maps
  ".map"
]);

const SENSITIVE_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /credentials\.json$/i,
  /secrets?\.json$/i
];

const LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock"
]);

const SUPPORTED_LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".json": "json"
};

/**
 * Evaluates whether a file should be indexed by RepoLens or excluded with a clear diagnostic reason.
 */
export function filterFile(filePath: string, sizeBytes?: number): FilterResult {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/");
  const fileName = segments[segments.length - 1];
  const ext = path.extname(fileName).toLowerCase();

  // Check directory exclusion
  for (const segment of segments.slice(0, -1)) {
    if (EXCLUDED_DIR_SEGMENTS.has(segment.toLowerCase())) {
      return {
        isIncluded: false,
        language: "unknown",
        exclusionReason: `Ignored directory segment: '${segment}'`
      };
    }
  }

  // Check sensitive/secret files
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(fileName)) {
      return {
        isIncluded: false,
        language: "unknown",
        exclusionReason: "Potentially sensitive/secret configuration file"
      };
    }
  }

  // Check lockfiles
  if (LOCKFILES.has(fileName.toLowerCase())) {
    return {
      isIncluded: false,
      language: "json",
      exclusionReason: "Lockfile excluded from code intelligence indexing"
    };
  }

  // Check minified/bundle files
  if (fileName.includes(".min.") || fileName.includes(".bundle.") || fileName.includes(".chunk.")) {
    return {
      isIncluded: false,
      language: "javascript",
      exclusionReason: "Minified/bundled artifact excluded from static analysis"
    };
  }

  // Check binary/media extensions
  if (EXCLUDED_EXTENSIONS.has(ext)) {
    return {
      isIncluded: false,
      language: "binary",
      exclusionReason: `Binary/media file type: '${ext}'`
    };
  }

  // Check file size cap
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isIncluded: false,
      language: "unknown",
      exclusionReason: `File size (${(sizeBytes / 1024).toFixed(1)} KB) exceeds limit of ${MAX_FILE_SIZE_BYTES / 1024} KB`
    };
  }

  // Check language support
  const language = SUPPORTED_LANGUAGE_EXTENSIONS[ext];
  if (!language) {
    return {
      isIncluded: false,
      language: "unknown",
      exclusionReason: `Unsupported file extension: '${ext || "none"}'`
    };
  }

  return {
    isIncluded: true,
    language
  };
}
