import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { BaseParser } from './base.parser';
import type {
  ParseResult,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  ParserOptions,
  ParameterInfo,
} from './types';

export class TypeScriptParser extends BaseParser {
  readonly supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  readonly language = 'typescript';

  parse(sourceCode: string, options?: ParserOptions): ParseResult {
    const functions: FunctionInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    let ast: t.File;
    try {
      // Parse with TypeScript and JSX support
      ast = parse(sourceCode, {
        sourceType: options?.sourceType || 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });
    } catch (error) {
      // If parsing fails, return empty result
      console.error('Parse error:', error);
      return {
        functions: [],
        imports: [],
        exports: [],
      };
    }

    // Store reference to this for use in traverse callbacks
    const self = this;

    // Traverse the AST and extract information
    traverse(ast, {
      // Extract imports
      ImportDeclaration(path) {
        const node = path.node;
        const importPath = node.source.value;
        const importedNames: string[] = [];
        let isDefaultImport = false;

        node.specifiers.forEach((specifier) => {
          if (t.isImportDefaultSpecifier(specifier)) {
            isDefaultImport = true;
            importedNames.push(specifier.local.name);
          } else if (t.isImportSpecifier(specifier)) {
            const importedName = t.isIdentifier(specifier.imported)
              ? specifier.imported.name
              : specifier.imported.value;
            importedNames.push(importedName);
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            importedNames.push(`* as ${specifier.local.name}`);
          }
        });

        imports.push({
          moduleName: importPath.split('/').pop() || importPath,
          importedNames,
          isDefaultImport,
          importPath,
          line: node.loc?.start.line || 0,
        });
      },

      // Extract named exports
      ExportNamedDeclaration(path) {
        const node = path.node;

        if (node.declaration) {
          if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
            exports.push({
              name: node.declaration.id.name,
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
            exports.push({
              name: node.declaration.id.name,
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          } else if (t.isVariableDeclaration(node.declaration)) {
            node.declaration.declarations.forEach((declarator) => {
              if (t.isIdentifier(declarator.id)) {
                exports.push({
                  name: declarator.id.name,
                  type: 'named',
                  line: node.loc?.start.line || 0,
                });
              }
            });
          } else if (t.isTSInterfaceDeclaration(node.declaration)) {
            exports.push({
              name: node.declaration.id.name,
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          } else if (t.isTSTypeAliasDeclaration(node.declaration)) {
            exports.push({
              name: node.declaration.id.name,
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          }
        }

        // Export specifiers (e.g., export { foo, bar })
        if (node.specifiers) {
          node.specifiers.forEach((specifier) => {
            if (t.isExportSpecifier(specifier)) {
              const exportedName = t.isIdentifier(specifier.exported)
                ? specifier.exported.name
                : specifier.exported.value;
              exports.push({
                name: exportedName,
                type: 'named',
                line: node.loc?.start.line || 0,
              });
            }
          });
        }
      },

      // Extract default exports
      ExportDefaultDeclaration(path) {
        const node = path.node;
        let name = 'default';

        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          name = node.declaration.id.name;
        } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
          name = node.declaration.id.name;
        } else if (t.isIdentifier(node.declaration)) {
          name = node.declaration.name;
        }

        exports.push({
          name,
          type: 'default',
          line: node.loc?.start.line || 0,
        });
      },

      // Extract functions
      FunctionDeclaration(path) {
        const node = path.node;
        if (!node.id) return;

        const isExported = self.isNodeExported(path);
        const docComment = self.extractDocFromNode(path);

        functions.push({
          name: node.id.name,
          type: 'function',
          signature: self.getFunctionSignature(node),
          docComment,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          parameters: self.extractParameters(node.params),
          returnType: self.extractReturnType(node.returnType),
          isExported,
          isAsync: node.async,
        });
      },

      // Extract arrow functions assigned to variables
      VariableDeclarator(path) {
        const node = path.node;
        if (!t.isIdentifier(node.id)) return;
        if (!t.isArrowFunctionExpression(node.init) && !t.isFunctionExpression(node.init)) return;

        const isExported = self.isVariableExported(path);
        const docComment = self.extractDocFromNode(path);

        functions.push({
          name: node.id.name,
          type: 'function',
          signature: self.getArrowFunctionSignature(node.id.name, node.init),
          docComment,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          parameters: self.extractParameters(node.init.params),
          returnType: self.extractReturnType(node.init.returnType),
          isExported,
          isAsync: node.init.async,
        });
      },

      // Extract classes
      ClassDeclaration(path) {
        const node = path.node;
        if (!node.id) return;

        const isExported = self.isNodeExported(path);
        const docComment = self.extractDocFromNode(path);

        functions.push({
          name: node.id.name,
          type: 'class',
          signature: `class ${node.id.name}`,
          docComment,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          isExported,
        });

        // Extract class methods
        node.body.body.forEach((member) => {
          if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
            const methodName = member.key.name;
            let accessibility: 'public' | 'private' | 'protected' | undefined;

            if (member.accessibility) {
              accessibility = member.accessibility as 'public' | 'private' | 'protected';
            }

            functions.push({
              name: `${node.id!.name}.${methodName}`,
              type: 'method',
              signature: self.getMethodSignature(node.id!.name, methodName, member),
              startLine: member.loc?.start.line || 0,
              endLine: member.loc?.end.line || 0,
              parameters: self.extractParameters(member.params),
              returnType: self.extractReturnType(member.returnType),
              isExported,
              isAsync: member.async,
              accessibility,
            });
          }
        });
      },

      // Extract TypeScript interfaces
      TSInterfaceDeclaration(path) {
        const node = path.node;
        const isExported = self.isNodeExported(path);
        const docComment = self.extractDocFromNode(path);

        functions.push({
          name: node.id.name,
          type: 'interface',
          signature: `interface ${node.id.name}`,
          docComment,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          isExported,
        });
      },

      // Extract TypeScript type aliases
      TSTypeAliasDeclaration(path) {
        const node = path.node;
        const isExported = self.isNodeExported(path);
        const docComment = self.extractDocFromNode(path);

        functions.push({
          name: node.id.name,
          type: 'type',
          signature: `type ${node.id.name}`,
          docComment,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          isExported,
        });
      },
    });

    return {
      functions,
      imports,
      exports,
      languageFeatures: {
        hasClasses: functions.some((f) => f.type === 'class'),
        hasInterfaces: functions.some((f) => f.type === 'interface'),
        hasTypes: functions.some((f) => f.type === 'type'),
        hasDecorators: false, // Could detect this
        usesJSX: sourceCode.includes('jsx') || sourceCode.includes('tsx'),
      },
    };
  }

  private getFunctionSignature(node: t.FunctionDeclaration): string {
    const name = node.id?.name || 'anonymous';
    const params = node.params.map((p) => this.paramToString(p)).join(', ');
    const asyncPrefix = node.async ? 'async ' : '';
    return this.cleanSignature(`${asyncPrefix}function ${name}(${params})`);
  }

  private getArrowFunctionSignature(
    name: string,
    node: t.ArrowFunctionExpression | t.FunctionExpression
  ): string {
    const params = node.params.map((p) => this.paramToString(p)).join(', ');
    const asyncPrefix = node.async ? 'async ' : '';
    return this.cleanSignature(`${asyncPrefix}const ${name} = (${params}) =>`);
  }

  private getMethodSignature(className: string, methodName: string, node: t.ClassMethod): string {
    const params = node.params.map((p) => this.paramToString(p)).join(', ');
    const asyncPrefix = node.async ? 'async ' : '';
    const kind = node.kind === 'constructor' ? 'constructor' : methodName;
    return this.cleanSignature(`${asyncPrefix}${kind}(${params})`);
  }

  private paramToString(param: any): string {
    // Handle TSParameterProperty (e.g., constructor(public name: string))
    if (t.isTSParameterProperty(param)) {
      param = param.parameter;
    }

    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      return `${param.left.name} = ...`;
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      return `...${param.argument.name}`;
    }
    return 'param';
  }

  private extractParameters(params: any[]): ParameterInfo[] {
    return params.map((param) => {
      // Handle TSParameterProperty (e.g., constructor(public name: string))
      if (t.isTSParameterProperty(param)) {
        param = param.parameter;
      }

      if (t.isIdentifier(param)) {
        return {
          name: param.name,
          type: param.typeAnnotation ? 'any' : undefined,
          optional: param.optional || false,
        };
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        return {
          name: param.left.name,
          optional: true,
          defaultValue: 'default',
        };
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        return {
          name: param.argument.name,
          type: 'rest',
        };
      }
      return { name: 'param' };
    });
  }

  private extractReturnType(returnType: any): string | undefined {
    if (!returnType || t.isNoop(returnType)) return undefined;
    // Simplified - in a real implementation, you'd stringify the type
    return 'any';
  }

  private isNodeExported(path: any): boolean {
    let parent = path.parentPath;
    while (parent) {
      if (parent.isExportNamedDeclaration() || parent.isExportDefaultDeclaration()) {
        return true;
      }
      parent = parent.parentPath;
    }
    return false;
  }

  private isVariableExported(path: any): boolean {
    const declarationPath = path.parentPath;
    if (!declarationPath) return false;

    let parent = declarationPath.parentPath;
    while (parent) {
      if (parent.isExportNamedDeclaration() || parent.isExportDefaultDeclaration()) {
        return true;
      }
      parent = parent.parentPath;
    }
    return false;
  }

  private extractDocFromNode(path: any): string | undefined {
    // Get leading comments from the node
    const node = path.node;
    if (!node.leadingComments || node.leadingComments.length === 0) {
      return undefined;
    }

    const lastComment = node.leadingComments[node.leadingComments.length - 1];
    if (!lastComment) return undefined;

    // Clean up JSDoc comment
    const value = lastComment.value || '';
    return value
      .split('\n')
      .map((line: string) => line.trim().replace(/^\*\s?/, ''))
      .join('\n')
      .trim();
  }
}
