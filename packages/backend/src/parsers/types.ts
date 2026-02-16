export interface FunctionInfo {
  name: string;
  type: 'function' | 'method' | 'class' | 'interface' | 'type';
  signature: string;
  docComment?: string;
  startLine: number;
  endLine: number;
  parameters?: ParameterInfo[];
  returnType?: string;
  isExported: boolean;
  isAsync?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  moduleName: string;
  importedNames: string[];
  isDefaultImport: boolean;
  importPath: string;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 'all';
  line: number;
}

export interface ParseResult {
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  languageFeatures?: {
    hasClasses: boolean;
    hasInterfaces: boolean;
    hasTypes: boolean;
    hasDecorators: boolean;
    usesJSX: boolean;
  };
}

export interface ParserOptions {
  sourceType?: 'module' | 'script';
  plugins?: string[];
}
