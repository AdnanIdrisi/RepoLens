import { ParserAdapter, ParsedSource } from "./parser.interface.js";
import { JavaScriptParser } from "./javascript.parser.js";
import { TypeScriptParser } from "./typescript.parser.js";
import { TsxParser } from "./tsx.parser.js";

export class SourceParser {
  private adapters: ParserAdapter[];

  constructor() {
    this.adapters = [
      new TsxParser(),
      new TypeScriptParser(),
      new JavaScriptParser()
    ];
  }

  public parse(filePath: string, sourceText: string): ParsedSource {
    for (const adapter of this.adapters) {
      if (adapter.canParse(filePath)) {
        return adapter.parse(filePath, sourceText);
      }
    }

    // Default to JavaScript parser for unknown extensions
    return this.adapters[2].parse(filePath, sourceText);
  }
}
