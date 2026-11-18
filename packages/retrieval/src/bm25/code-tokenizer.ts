/**
 * Code-aware tokenizer.
 * Handles CamelCase, PascalCase, snake_case, kebab-case, path delimiters, and code punctuation.
 */

const CODE_STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "by", "of",
  "is", "it", "this", "that", "these", "those", "from", "as", "be", "was", "are",
  "const", "let", "var", "function", "return", "import", "export", "default", "class"
]);

export interface TokenizeOptions {
  preserveOriginal?: boolean;
  minTokenLength?: number;
  removeStopWords?: boolean;
}

export class CodeTokenizer {
  /**
   * Splits a string into code-aware tokens.
   * e.g. "findUserById" -> ["finduserbyid", "find", "user", "by", "id"]
   * e.g. "src/controllers/order_processor.ts" -> ["src", "controllers", "order_processor", "order", "processor", "ts"]
   */
  public static tokenize(text: string, options: TokenizeOptions = {}): string[] {
    const {
      preserveOriginal = true,
      minTokenLength = 2,
      removeStopWords = true
    } = options;

    if (!text || typeof text !== "string") {
      return [];
    }

    const tokens = new Set<string>();

    const addToken = (token: string) => {
      const lower = token.toLowerCase().trim();
      if (lower.length >= minTokenLength && (!removeStopWords || !CODE_STOP_WORDS.has(lower))) {
        tokens.add(lower);
      }
    };

    // 1. Split text by whitespace and delimiters outside word chars
    const chunks = text.split(/[\s,;{}()\[\]<>'"=!?*&|^%~`+]+/);

    for (const chunk of chunks) {
      if (!chunk) continue;

      if (preserveOriginal) {
        addToken(chunk);
      }

      // 2. Split path segments and file extensions: "src/controllers/order_processor.ts"
      const pathSegments = chunk.split(/[\/\\:]+/);
      for (const segment of pathSegments) {
        if (!segment) continue;

        // Split by dot (e.g. filename.ext or object.property)
        const dotParts = segment.split(".");
        for (const dotPart of dotParts) {
          if (!dotPart) continue;
          addToken(dotPart); // includes "order_processor", "ts", "controller"

          // 3. Split snake_case and kebab-case
          const snakeParts = dotPart.split(/[-_]+/);
          if (snakeParts.length > 1) {
            for (const sp of snakeParts) {
              addToken(sp);
            }
          }

          // 4. Split CamelCase / PascalCase: "getUserAuthToken" -> "get", "user", "auth", "token"
          for (const sp of snakeParts) {
            const camelParts = sp
              .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
              .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
              .toLowerCase()
              .split(/\s+/);

            if (camelParts.length > 1) {
              for (const cp of camelParts) {
                addToken(cp);
              }
            }
          }
        }
      }
    }

    return Array.from(tokens);
  }
}
