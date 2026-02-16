import { TypeScriptParser } from './typescript.parser';
import { PythonParser } from './python.parser';
import type { BaseParser } from './base.parser';
import type { ParseResult } from './types';

export class ParserService {
  private parsers: BaseParser[];

  constructor() {
    this.parsers = [new TypeScriptParser(), new PythonParser()];
  }

  /**
   * Get the appropriate parser for a file extension
   */
  getParser(extension: string): BaseParser | null {
    const parser = this.parsers.find((p) => p.canParse(extension));
    return parser || null;
  }

  /**
   * Parse a file's source code
   */
  parseFile(sourceCode: string, extension: string): ParseResult | null {
    const parser = this.getParser(extension);
    if (!parser) {
      return null;
    }

    try {
      return parser.parse(sourceCode);
    } catch (error) {
      console.error(`Failed to parse file with extension ${extension}:`, error);
      return null;
    }
  }

  /**
   * Check if a file extension can be parsed
   */
  canParse(extension: string): boolean {
    return this.parsers.some((p) => p.canParse(extension));
  }

  /**
   * Get list of all supported extensions
   */
  getSupportedExtensions(): string[] {
    return this.parsers.flatMap((p) => p.supportedExtensions);
  }
}

// Export singleton instance
export const parserService = new ParserService();
