import { BaseParser } from './base.parser';
import type {
  ParseResult,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  ParserOptions,
} from './types';

export class PythonParser extends BaseParser {
  readonly supportedExtensions = ['.py'];
  readonly language = 'python';

  parse(sourceCode: string, _options?: ParserOptions): ParseResult {
    const functions: FunctionInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = []; // Python doesn't have explicit exports like JS

    const lines = sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Extract imports
      const importMatch = this.matchImport(trimmedLine);
      if (importMatch) {
        imports.push({
          ...importMatch,
          line: i + 1,
        });
      }

      // Extract function definitions
      const functionMatch = this.matchFunction(trimmedLine);
      if (functionMatch) {
        const docComment = this.extractPythonDocstring(lines, i + 1);
        const endLine = this.findFunctionEnd(lines, i);

        functions.push({
          name: functionMatch.name,
          type: 'function',
          signature: this.cleanSignature(trimmedLine),
          docComment,
          startLine: i + 1,
          endLine: endLine + 1,
          parameters: functionMatch.parameters,
          isExported: !functionMatch.name.startsWith('_'), // Convention: _ prefix = private
          isAsync: functionMatch.isAsync,
        });
      }

      // Extract class definitions
      const classMatch = this.matchClass(trimmedLine);
      if (classMatch) {
        const docComment = this.extractPythonDocstring(lines, i + 1);
        const endLine = this.findClassEnd(lines, i);

        functions.push({
          name: classMatch.name,
          type: 'class',
          signature: this.cleanSignature(trimmedLine),
          docComment,
          startLine: i + 1,
          endLine: endLine + 1,
          isExported: !classMatch.name.startsWith('_'),
        });

        // Extract methods from class
        const methods = this.extractMethods(lines, i, endLine, classMatch.name);
        functions.push(...methods);
      }
    }

    return {
      functions,
      imports,
      exports,
      languageFeatures: {
        hasClasses: functions.some((f) => f.type === 'class'),
        hasInterfaces: false,
        hasTypes: false,
        hasDecorators: sourceCode.includes('@'),
        usesJSX: false,
      },
    };
  }

  private matchImport(line: string): Omit<ImportInfo, 'line'> | null {
    // Match: import module
    const simpleImportMatch = line.match(/^import\s+([a-zA-Z0-9_.,\s]+)/);
    if (simpleImportMatch) {
      const modules = simpleImportMatch[1].split(',').map((m) => m.trim());
      return {
        moduleName: modules[0],
        importedNames: modules,
        isDefaultImport: true,
        importPath: modules[0],
      };
    }

    // Match: from module import name1, name2
    const fromImportMatch = line.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)/);
    if (fromImportMatch) {
      const moduleName = fromImportMatch[1];
      const imports = fromImportMatch[2]
        .split(',')
        .map((name) => name.trim().split(' as ')[0].trim());

      return {
        moduleName,
        importedNames: imports,
        isDefaultImport: false,
        importPath: moduleName,
      };
    }

    return null;
  }

  private matchFunction(
    line: string
  ): { name: string; parameters: any[]; isAsync: boolean } | null {
    // Match: def function_name(params):
    // Match: async def function_name(params):
    const match = line.match(/^(async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (!match) return null;

    const isAsync = !!match[1];
    const name = match[2];
    const paramsStr = match[3];

    const parameters = paramsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== 'self' && p !== 'cls')
      .map((p) => {
        const [paramName, defaultValue] = p.split('=').map((s) => s.trim());
        return {
          name: paramName,
          optional: !!defaultValue,
          defaultValue,
        };
      });

    return { name, parameters, isAsync };
  }

  private matchClass(line: string): { name: string } | null {
    // Match: class ClassName:
    // Match: class ClassName(BaseClass):
    const match = line.match(/^class\s+([a-zA-Z0-9_]+)/);
    if (!match) return null;

    return { name: match[1] };
  }

  private extractPythonDocstring(lines: string[], startLine: number): string | undefined {
    // Look for docstring on the next non-empty line
    for (let i = startLine; i < Math.min(startLine + 5, lines.length); i++) {
      const line = lines[i].trim();

      // Triple quoted docstring
      if (line.startsWith('"""') || line.startsWith("'''")) {
        const quote = line.startsWith('"""') ? '"""' : "'''";
        let docstring = line.substring(3);

        // Single line docstring
        if (docstring.endsWith(quote)) {
          return docstring.substring(0, docstring.length - 3).trim();
        }

        // Multi-line docstring
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.includes(quote)) {
            docstring += '\n' + nextLine.substring(0, nextLine.indexOf(quote));
            return docstring.trim();
          }
          docstring += '\n' + nextLine;
        }
      }

      // If we hit a non-comment, non-docstring line, stop
      if (line && !line.startsWith('#')) {
        break;
      }
    }

    return undefined;
  }

  private findFunctionEnd(lines: string[], startLine: number): number {
    const startIndent = this.getIndentLevel(lines[startLine]);

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue; // Skip empty lines

      const indent = this.getIndentLevel(line);
      if (indent <= startIndent) {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  private findClassEnd(lines: string[], startLine: number): number {
    return this.findFunctionEnd(lines, startLine);
  }

  private extractMethods(
    lines: string[],
    classStart: number,
    classEnd: number,
    className: string
  ): FunctionInfo[] {
    const methods: FunctionInfo[] = [];

    for (let i = classStart + 1; i <= classEnd; i++) {
      const line = lines[i].trim();
      const functionMatch = this.matchFunction(line);

      if (functionMatch) {
        const docComment = this.extractPythonDocstring(lines, i + 1);
        const endLine = this.findFunctionEnd(lines, i);

        // Determine accessibility based on naming convention
        let accessibility: 'public' | 'private' | 'protected' | undefined;
        if (functionMatch.name.startsWith('__') && !functionMatch.name.endsWith('__')) {
          accessibility = 'private';
        } else if (functionMatch.name.startsWith('_')) {
          accessibility = 'protected';
        } else {
          accessibility = 'public';
        }

        methods.push({
          name: `${className}.${functionMatch.name}`,
          type: 'method',
          signature: this.cleanSignature(line),
          docComment,
          startLine: i + 1,
          endLine: endLine + 1,
          parameters: functionMatch.parameters,
          isExported: accessibility === 'public',
          isAsync: functionMatch.isAsync,
          accessibility,
        });
      }
    }

    return methods;
  }

  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}
