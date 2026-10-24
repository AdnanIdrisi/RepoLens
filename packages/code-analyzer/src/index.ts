/**
 * @repolens/code-analyzer
 * Tree-sitter and AST parsers, extractors for functions, classes, imports, exports, calls, and Express routes.
 */
export const CODE_ANALYZER_VERSION = "0.1.0";

export * from "./parsers/parser.interface.js";
export * from "./parsers/source.parser.js";
export * from "./parsers/javascript.parser.js";
export * from "./parsers/typescript.parser.js";
export * from "./parsers/tsx.parser.js";

export * from "./extractors/imports.extractor.js";
export * from "./extractors/exports.extractor.js";
export * from "./extractors/functions.extractor.js";
export * from "./extractors/classes.extractor.js";
export * from "./extractors/calls.extractor.js";
export * from "./extractors/routes.extractor.js";

export * from "./diagnostics/parser.diagnostics.js";
export * from "./symbols/symbol-identity.js";
export * from "./resolvers/index.js";
export * from "./analyzer.js";
