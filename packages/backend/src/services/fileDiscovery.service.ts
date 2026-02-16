import fg from 'fast-glob';
import path from 'path';
import fs from 'fs/promises';
import mime from 'mime-types';
import { logger } from '../utils/logger';

export interface FileInfo {
  path: string;
  relativePath: string;
  language: string;
  size: number;
  extension: string;
}

export interface DiscoveryResult {
  files: FileInfo[];
  stats: {
    totalFiles: number;
    totalSize: number;
    languageBreakdown: Record<string, number>;
  };
}

export class FileDiscoveryService {
  // Directories to ignore
  private readonly ignoredDirs = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/out/**',
    '**/.cache/**',
    '**/.vscode/**',
    '**/.idea/**',
    '**/vendor/**',
    '**/venv/**',
    '**/__pycache__/**',
    '**/.pytest_cache/**',
    '**/target/**', // Rust/Java build dirs
    '**/bin/**',
    '**/obj/**',
  ];

  // File extensions to ignore
  private readonly ignoredExtensions = [
    '**/*.lock',
    '**/*.log',
    '**/*.map',
    '**/*.min.js',
    '**/*.min.css',
    '**/*.bundle.js',
    '**/*.chunk.js',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/bun.lockb',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.svg',
    '**/*.ico',
    '**/*.woff',
    '**/*.woff2',
    '**/*.ttf',
    '**/*.eot',
    '**/*.pdf',
    '**/*.zip',
    '**/*.tar',
    '**/*.gz',
  ];

  // Language mappings
  private readonly languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.md': 'markdown',
    '.sql': 'sql',
  };

  /**
   * Discover all files in a directory
   */
  async discoverFiles(projectPath: string): Promise<DiscoveryResult> {
    try {
      logger.info('Starting file discovery', { projectPath });

      // Find all files, excluding ignored patterns
      const files = await fg('**/*', {
        cwd: projectPath,
        ignore: [...this.ignoredDirs, ...this.ignoredExtensions],
        dot: true, // Include dotfiles
        onlyFiles: true,
        absolute: false,
      });

      logger.info(`Found ${files.length} files`, { projectPath });

      // Process each file
      const fileInfos: FileInfo[] = [];
      let totalSize = 0;
      const languageBreakdown: Record<string, number> = {};

      for (const file of files) {
        try {
          const fullPath = path.join(projectPath, file);
          const stats = await fs.stat(fullPath);

          // Skip files larger than 1MB (likely binary or generated files)
          if (stats.size > 1024 * 1024) {
            logger.debug('Skipping large file', { file, size: stats.size });
            continue;
          }

          // Skip empty files
          if (stats.size === 0) {
            continue;
          }

          const ext = path.extname(file).toLowerCase();
          const language = this.getLanguage(ext);

          // Skip files with unknown language
          if (language === 'unknown') {
            continue;
          }

          const fileInfo: FileInfo = {
            path: fullPath,
            relativePath: file,
            language,
            size: stats.size,
            extension: ext,
          };

          fileInfos.push(fileInfo);
          totalSize += stats.size;

          // Update language breakdown
          languageBreakdown[language] = (languageBreakdown[language] || 0) + 1;
        } catch (error) {
          logger.warn('Failed to process file', { file, error });
          // Continue with other files
        }
      }

      const result: DiscoveryResult = {
        files: fileInfos,
        stats: {
          totalFiles: fileInfos.length,
          totalSize,
          languageBreakdown,
        },
      };

      logger.info('File discovery completed', {
        totalFiles: result.stats.totalFiles,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        languages: Object.keys(languageBreakdown).length,
      });

      return result;
    } catch (error) {
      logger.error('File discovery failed', { projectPath, error });
      throw new Error(
        `Failed to discover files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get language from file extension
   */
  private getLanguage(extension: string): string {
    return this.languageMap[extension] || 'unknown';
  }

  /**
   * Read file content
   */
  async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read file', { filePath, error });
      throw new Error('Failed to read file content');
    }
  }

  /**
   * Get primary language of a project
   */
  getPrimaryLanguage(languageBreakdown: Record<string, number>): string {
    const entries = Object.entries(languageBreakdown);
    if (entries.length === 0) return 'unknown';

    // Sort by count descending
    entries.sort((a, b) => b[1] - a[1]);

    return entries[0][0];
  }
}

export const fileDiscoveryService = new FileDiscoveryService();
