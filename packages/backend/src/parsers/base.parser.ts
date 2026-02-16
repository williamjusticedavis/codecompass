import type { ParseResult, ParserOptions } from './types';

export abstract class BaseParser {
  abstract readonly supportedExtensions: string[];
  abstract readonly language: string;

  /**
   * Parse source code and extract functions, imports, exports
   */
  abstract parse(sourceCode: string, options?: ParserOptions): ParseResult;

  /**
   * Check if this parser can handle the given file extension
   */
  canParse(extension: string): boolean {
    return this.supportedExtensions.includes(extension);
  }

  /**
   * Extract a clean signature from function/method code
   */
  protected cleanSignature(signature: string): string {
    return signature
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract JSDoc or docstring comment
   */
  protected extractDocComment(comments: any[]): string | undefined {
    if (!comments || comments.length === 0) return undefined;

    // Find the last comment before the node (JSDoc style)
    const lastComment = comments[comments.length - 1];
    if (!lastComment) return undefined;

    const value = lastComment.value || '';
    return value.trim();
  }
}
