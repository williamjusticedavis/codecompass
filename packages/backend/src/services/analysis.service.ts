import { db } from '../db';
import { projects, files, functions, dependencies, analyses } from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { claudeService } from './claude.service';
import { logger } from '../utils/logger';

export type AnalysisType = 'overview' | 'architecture' | 'onboarding';

export interface ProjectStats {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalInterfaces: number;
  languages: Record<string, number>;
  topFiles: Array<{ path: string; functionCount: number }>;
}

// Build a summarized directory tree instead of listing every file
function buildSummarizedFileTree(allFiles: Array<{ path: string }>, maxLines = 200): string {
  const dirCounts: Record<string, { files: string[]; count: number }> = {};

  for (const f of allFiles) {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    const fileName = parts[parts.length - 1];
    if (!dirCounts[dir]) {
      dirCounts[dir] = { files: [], count: 0 };
    }
    dirCounts[dir].count++;
    if (dirCounts[dir].files.length < 5) {
      dirCounts[dir].files.push(fileName);
    }
  }

  const sortedDirs = Object.keys(dirCounts).sort();
  const lines: string[] = [];
  lines.push(`Total: ${allFiles.length} files across ${sortedDirs.length} directories\n`);

  for (const dir of sortedDirs) {
    if (lines.length >= maxLines) {
      lines.push(`... and ${sortedDirs.length - sortedDirs.indexOf(dir)} more directories`);
      break;
    }
    const { files: dirFiles, count } = dirCounts[dir];
    lines.push(`${dir}/ (${count} files)`);
    for (const file of dirFiles) {
      lines.push(`  ${file}`);
    }
    if (count > 5) {
      lines.push(`  ... and ${count - 5} more`);
    }
  }

  return lines.join('\n');
}

// Trim a section to fit within a character budget
function trimSection(section: string, maxChars: number): string {
  if (section.length <= maxChars) return section;
  return section.substring(0, maxChars) + '\n... (truncated to fit token limit)';
}

export class AnalysisService {
  /**
   * Generate project overview with AI analysis
   */
  async generateProjectOverview(projectId: string): Promise<{
    summary: string;
    stats: ProjectStats;
    tokensUsed: number;
  }> {
    logger.info('Generating project overview', { projectId });

    // Check if analysis already exists
    const existing = await this.getExistingAnalysis(projectId, 'overview');
    if (existing) {
      logger.info('Using cached project overview', { projectId });
      return JSON.parse(existing.result as string);
    }

    // Get project data
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error('Project not found');
    }

    // Get statistics
    const stats = await this.getProjectStats(projectId);

    // Get all file paths for full project structure
    const allFiles = await db
      .select({ path: files.path, language: files.language })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Get package.json / config files with actual content
    const configFiles = await this.getConfigFileContents(projectId);

    // Get key source files with content snippets
    const sourceFiles = await this.getSourceFileSnippets(projectId, 8);

    // Get all functions with signatures
    const allFunctions = await db
      .select({
        name: functions.name,
        type: functions.type,
        signature: functions.signature,
        filePath: files.path,
      })
      .from(functions)
      .innerJoin(files, eq(functions.fileId, files.id))
      .where(eq(functions.projectId, projectId))
      .limit(50);

    // Build prompt for Claude
    const prompt = this.buildOverviewPrompt(project, stats, allFiles, configFiles, sourceFiles, allFunctions);

    // Call Claude API
    const response = await claudeService.sendMessage(prompt, {
      model: 'claude-sonnet-4.5',
      maxTokens: 2048,
      systemPrompt: 'You are an expert software architect analyzing codebases. Provide clear, concise insights about code structure and purpose.',
    });

    const result = {
      summary: response.content,
      stats,
      tokensUsed: response.tokensUsed,
    };

    // Cache the result
    await this.cacheAnalysis(projectId, 'overview', result, response.tokensUsed);

    logger.info('Project overview generated', { projectId, tokensUsed: response.tokensUsed });

    return result;
  }

  /**
   * Generate architecture analysis
   */
  async generateArchitectureAnalysis(projectId: string): Promise<{
    analysis: string;
    patterns: string[];
    tokensUsed: number;
  }> {
    logger.info('Generating architecture analysis', { projectId });

    // Check if analysis already exists
    const existing = await this.getExistingAnalysis(projectId, 'architecture');
    if (existing) {
      logger.info('Using cached architecture analysis', { projectId });
      return JSON.parse(existing.result as string);
    }

    // Get project structure
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error('Project not found');
    }

    // Get file structure
    const allFiles = await db
      .select({
        path: files.path,
        language: files.language,
      })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Get dependencies
    const deps = await db
      .select({
        sourceFile: files.path,
        targetExternal: dependencies.targetExternal,
      })
      .from(dependencies)
      .innerJoin(files, eq(dependencies.sourceFileId, files.id))
      .where(eq(dependencies.projectId, projectId))
      .limit(50);

    // Get config files for accurate tech stack identification
    const configFiles = await this.getConfigFileContents(projectId);

    // Get source file snippets for actual code analysis
    const sourceFiles = await this.getSourceFileSnippets(projectId, 10);

    // Get all functions with file paths
    const allFunctions = await db
      .select({
        name: functions.name,
        type: functions.type,
        signature: functions.signature,
        filePath: files.path,
      })
      .from(functions)
      .innerJoin(files, eq(functions.fileId, files.id))
      .where(eq(functions.projectId, projectId))
      .limit(60);

    // Build prompt
    const prompt = this.buildArchitecturePrompt(project, allFiles, deps, configFiles, sourceFiles, allFunctions);

    // Call Claude API
    const response = await claudeService.sendMessage(prompt, {
      model: 'claude-sonnet-4.5',
      maxTokens: 3072,
      systemPrompt: 'You are an expert software architect. Analyze code structure and identify architectural patterns, design decisions, and best practices.',
    });

    const result = {
      analysis: response.content,
      patterns: this.extractPatterns(response.content),
      tokensUsed: response.tokensUsed,
    };

    // Cache the result
    await this.cacheAnalysis(projectId, 'architecture', result, response.tokensUsed);

    logger.info('Architecture analysis generated', { projectId, tokensUsed: response.tokensUsed });

    return result;
  }

  /**
   * Generate onboarding guide
   */
  async generateOnboardingGuide(projectId: string): Promise<{
    guide: string;
    keyFiles: string[];
    tokensUsed: number;
  }> {
    logger.info('Generating onboarding guide', { projectId });

    // Check if analysis already exists
    const existing = await this.getExistingAnalysis(projectId, 'onboarding');
    if (existing) {
      logger.info('Using cached onboarding guide', { projectId });
      return JSON.parse(existing.result as string);
    }

    // Get project data
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error('Project not found');
    }

    // Get stats and structure
    const stats = await this.getProjectStats(projectId);

    // Get key files (entry points, configs, etc.)
    const keyFiles = await this.identifyKeyFiles(projectId);

    // Get config files for setup instructions
    const configFiles = await this.getConfigFileContents(projectId);

    // Get all file paths for structure overview
    const allFiles = await db
      .select({ path: files.path })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Get source file snippets
    const sourceFiles = await this.getSourceFileSnippets(projectId, 6);

    // Build prompt
    const prompt = this.buildOnboardingPrompt(project, stats, keyFiles, configFiles, allFiles, sourceFiles);

    // Call Claude API
    const response = await claudeService.sendMessage(prompt, {
      model: 'claude-sonnet-4.5',
      maxTokens: 4096,
      systemPrompt: 'You are a senior developer creating onboarding documentation. Write clear, actionable guides for new developers joining the project.',
    });

    const result = {
      guide: response.content,
      keyFiles: keyFiles.map((f) => f.path),
      tokensUsed: response.tokensUsed,
    };

    // Cache the result
    await this.cacheAnalysis(projectId, 'onboarding', result, response.tokensUsed);

    logger.info('Onboarding guide generated', { projectId, tokensUsed: response.tokensUsed });

    return result;
  }

  /**
   * Get project statistics
   */
  private async getProjectStats(projectId: string): Promise<ProjectStats> {
    // Get file counts by language
    const filesByLanguage = await db
      .select({
        language: files.language,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(files)
      .where(eq(files.projectId, projectId))
      .groupBy(files.language);

    // Get function counts by type
    const functionCounts = await db
      .select({
        type: functions.type,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(functions)
      .where(eq(functions.projectId, projectId))
      .groupBy(functions.type);

    // Get top files by function count
    const topFiles = await db
      .select({
        path: files.path,
        functionCount: sql<number>`cast(count(${functions.id}) as integer)`,
      })
      .from(files)
      .leftJoin(functions, eq(files.id, functions.fileId))
      .where(eq(files.projectId, projectId))
      .groupBy(files.id, files.path)
      .orderBy(sql`count(${functions.id}) desc`)
      .limit(10);

    const totalFunctions = functionCounts.find((f) => f.type === 'function')?.count || 0;
    const totalClasses = functionCounts.find((f) => f.type === 'class')?.count || 0;
    const totalInterfaces = functionCounts.find((f) => f.type === 'interface')?.count || 0;

    return {
      totalFiles: filesByLanguage.reduce((sum, f) => sum + f.count, 0),
      totalFunctions,
      totalClasses,
      totalInterfaces,
      languages: Object.fromEntries(
        filesByLanguage.map((f) => [f.language || 'unknown', f.count])
      ),
      topFiles: topFiles.map((f) => ({
        path: f.path,
        functionCount: f.functionCount,
      })),
    };
  }

  /**
   * Identify key files in the project
   */
  private async identifyKeyFiles(projectId: string): Promise<Array<{ path: string; content: string }>> {
    const keyFilePatterns = [
      'package.json',
      'README.md',
      'index.ts',
      'index.js',
      'main.ts',
      'main.js',
      'app.ts',
      'app.js',
      'server.ts',
      'server.js',
    ];

    const keyFiles = await db
      .select()
      .from(files)
      .where(eq(files.projectId, projectId))
      .limit(100);

    return keyFiles
      .filter((file) =>
        keyFilePatterns.some((pattern) => file.path.toLowerCase().includes(pattern.toLowerCase()))
      )
      .slice(0, 5)
      .map((file) => ({
        path: file.path,
        content: (file.content || '').substring(0, 1000), // Limit content length
      }));
  }

  /**
   * Get config file contents (package.json, tsconfig, etc.)
   */
  private async getConfigFileContents(projectId: string, maxFiles = 5, maxContentPerFile = 1500): Promise<Array<{ path: string; content: string }>> {
    const configPatterns = [
      'package.json',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'pyproject.toml',
      'Gemfile',
      'pom.xml',
      'build.gradle',
    ];

    const allFiles = await db
      .select({ path: files.path, content: files.content })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Prioritize root-level configs first
    const configs = allFiles
      .filter((f) => configPatterns.some((p) => f.path.endsWith(p)))
      .sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        return aDepth - bDepth;
      })
      .slice(0, maxFiles)
      .map((f) => ({
        path: f.path,
        content: (f.content || '').substring(0, maxContentPerFile),
      }));

    return configs;
  }

  /**
   * Get source file snippets (first N source files with content)
   */
  private async getSourceFileSnippets(
    projectId: string,
    limit: number,
    maxContentPerFile = 800
  ): Promise<Array<{ path: string; content: string }>> {
    const sourceExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'rb', 'php'];

    const sourceFiles = await db
      .select({ path: files.path, content: files.content, extension: files.extension })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Prioritize entry-point-like files and shorter paths (closer to root)
    return sourceFiles
      .filter((f) => sourceExtensions.includes(f.extension || ''))
      .sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        return aDepth - bDepth;
      })
      .slice(0, limit)
      .map((f) => ({
        path: f.path,
        content: (f.content || '').substring(0, maxContentPerFile),
      }));
  }

  /**
   * Build overview prompt for Claude
   */
  private buildOverviewPrompt(
    project: any,
    stats: ProjectStats,
    allFiles: any[],
    configFiles: Array<{ path: string; content: string }>,
    sourceFiles: Array<{ path: string; content: string }>,
    allFunctions: any[]
  ): string {
    const fileTree = buildSummarizedFileTree(allFiles, 150);

    const configSection = trimSection(
      configFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      12000
    );

    const sourceSection = trimSection(
      sourceFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      10000
    );

    const functionsSection = trimSection(
      allFunctions.map((f: any) => `- [${f.type}] ${f.filePath}: ${f.signature || f.name}`).join('\n'),
      5000
    );

    return `Analyze this codebase and provide a comprehensive overview.

## Project Info
Name: ${project.name}
Primary Language: ${project.primaryLanguage || 'Unknown'}

## Statistics
- Total Files: ${stats.totalFiles}
- Functions: ${stats.totalFunctions}
- Classes: ${stats.totalClasses}
- Interfaces: ${stats.totalInterfaces}

## Languages
${Object.entries(stats.languages)
  .map(([lang, count]) => `- ${lang}: ${count} files`)
  .join('\n')}

## Project Structure (summarized)
${fileTree}

## Configuration Files (these definitively identify the tech stack)
${configSection || 'No config files found'}

## Source Code Samples
${sourceSection || 'No source files found'}

## Functions & Classes Found
${functionsSection || 'None extracted'}

Based on ALL the information above (especially the configuration files and actual source code), provide:
1. **What this project does** (2-3 sentences based on actual code, not guessing)
2. **Technology stack** (identify frameworks from package.json/config files - do NOT guess)
3. **Code structure observations** (how is the code organized)
4. **Project complexity** (simple/moderate/complex)

IMPORTANT: Base your analysis on the actual configuration files and source code provided. Do not guess or assume frameworks that aren't explicitly listed in the dependencies.

Format your response in clear markdown.`;
  }

  /**
   * Build architecture prompt for Claude
   */
  private buildArchitecturePrompt(
    project: any,
    allFiles: any[],
    deps: any[],
    configFiles: Array<{ path: string; content: string }>,
    sourceFiles: Array<{ path: string; content: string }>,
    allFunctions: any[]
  ): string {
    const fileTree = buildSummarizedFileTree(allFiles, 150);

    const externalDeps = Array.from(new Set(deps.map((d: any) => d.targetExternal))).filter(Boolean);

    const configSection = trimSection(
      configFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      12000
    );

    const sourceSection = trimSection(
      sourceFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      12000
    );

    const functionsSection = trimSection(
      allFunctions.map((f: any) => `- [${f.type}] ${f.filePath}: ${f.signature || f.name}`).join('\n'),
      6000
    );

    return `Analyze the architecture of this codebase in detail.

## Project Info
Name: ${project.name}
Total Files: ${allFiles.length}

## Project Structure (summarized)
${fileTree}

## External Dependencies
${externalDeps.slice(0, 30).join(', ') || 'None found'}

## Configuration Files
${configSection || 'No config files found'}

## Source Code Samples
${sourceSection || 'No source files found'}

## Functions & Classes
${functionsSection || 'None extracted'}

Based on ALL the information above, analyze:
1. **Architectural Pattern(s)** - What patterns does this project use? (MVC, layered, component-based, etc.)
2. **Code Organization** - How is the code structured? What are the key directories?
3. **Main Components/Modules** - What are the major parts of the application?
4. **Design Decisions** - Notable patterns, libraries, or conventions used
5. **Dependencies Analysis** - Key external libraries and what they're used for

IMPORTANT: Base your analysis on the actual code and configuration files. Identify frameworks from package.json/config dependencies, not from guessing.

Format your response in clear markdown with headers and bullet points.`;
  }

  /**
   * Build onboarding prompt for Claude
   */
  private buildOnboardingPrompt(
    project: any,
    stats: ProjectStats,
    keyFiles: any[],
    configFiles: Array<{ path: string; content: string }>,
    allFiles: any[],
    sourceFiles: Array<{ path: string; content: string }>
  ): string {
    const fileTree = buildSummarizedFileTree(allFiles, 150);

    const configSection = trimSection(
      configFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      12000
    );

    const keyFilesSection = trimSection(
      keyFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      8000
    );

    const sourceSection = trimSection(
      sourceFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      10000
    );

    return `Create a comprehensive onboarding guide for developers new to this project.

## Project Info
Name: ${project.name}
Primary Language: ${project.primaryLanguage || 'Unknown'}

## Statistics
- Files: ${stats.totalFiles}
- Functions: ${stats.totalFunctions}
- Classes: ${stats.totalClasses}

## Project Structure (summarized)
${fileTree}

## Configuration Files (use these to determine setup steps)
${configSection || 'No config files found'}

## Key Entry Point Files
${keyFilesSection || 'No key files identified'}

## Source Code Samples
${sourceSection || 'No source files found'}

Based on ALL the information above (especially the configuration files and source code), create an onboarding guide that includes:
1. **Project Overview**: What this project does (based on actual code, not guessing)
2. **Tech Stack**: List the actual frameworks and libraries from the config files
3. **Getting Started**: Setup steps based on the actual package manager and scripts in config
4. **Project Structure**: Key directories and their purposes based on the file tree
5. **Important Files**: Where to start reading the code
6. **Development Workflow**: How to run, test, and build (from actual scripts in config)
7. **Key Concepts**: Important patterns or conventions observed in the code

IMPORTANT: Base everything on the actual files and configuration provided. Identify the package manager, frameworks, and tools from config files, not from guessing.

Format the guide in clear markdown with headers and bullet points.`;
  }

  /**
   * Query the codebase with a specific question
   */
  async queryCodebase(projectId: string, question: string): Promise<{
    answer: string;
    tokensUsed: number;
  }> {
    logger.info('Querying codebase', { projectId, question });

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error('Project not found');
    }

    // Get all file paths
    const allFiles = await db
      .select({ path: files.path, language: files.language })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Get config files
    const configFiles = await this.getConfigFileContents(projectId);

    // Get source files with content
    const sourceFiles = await this.getSourceFileSnippets(projectId, 12);

    // Get all functions
    const allFunctions = await db
      .select({
        name: functions.name,
        type: functions.type,
        signature: functions.signature,
        filePath: files.path,
      })
      .from(functions)
      .innerJoin(files, eq(functions.fileId, files.id))
      .where(eq(functions.projectId, projectId))
      .limit(80);

    const fileTree = buildSummarizedFileTree(allFiles, 120);

    const configSection = trimSection(
      configFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      10000
    );

    const sourceSection = trimSection(
      sourceFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
      10000
    );

    const functionsSection = trimSection(
      allFunctions.map((f: any) => `- [${f.type}] ${f.filePath}: ${f.signature || f.name}`).join('\n'),
      5000
    );

    const prompt = `You are answering a developer's question about a codebase.

## Project: ${project.name}

## Project Structure (summarized)
${fileTree}

## Configuration Files
${configSection || 'None'}

## Source Code
${sourceSection || 'None'}

## Functions & Classes
${functionsSection || 'None'}

## Developer's Question
${question}

Answer the question based ONLY on the actual code and files provided above. Be specific, reference file paths and function names where relevant. If you can't answer from the provided code, say so.

Format your response in clear markdown.`;

    const response = await claudeService.sendMessage(prompt, {
      model: 'claude-sonnet-4.5',
      maxTokens: 3072,
      systemPrompt: 'You are a helpful senior developer answering questions about a codebase. Be concise, accurate, and reference specific files and code.',
    });

    return {
      answer: response.content,
      tokensUsed: response.tokensUsed,
    };
  }

  /**
   * Extract architectural patterns from analysis
   */
  private extractPatterns(analysis: string): string[] {
    const patterns = [];
    const commonPatterns = [
      'MVC',
      'MVVM',
      'Repository',
      'Service Layer',
      'Factory',
      'Singleton',
      'Observer',
      'Layered',
      'Microservices',
      'Monolithic',
      'REST',
      'GraphQL',
    ];

    for (const pattern of commonPatterns) {
      if (analysis.toLowerCase().includes(pattern.toLowerCase())) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Check if analysis already exists in cache
   */
  private async getExistingAnalysis(
    projectId: string,
    analysisType: AnalysisType
  ): Promise<any | null> {
    const [existing] = await db
      .select()
      .from(analyses)
      .where(and(eq(analyses.projectId, projectId), eq(analyses.analysisType, analysisType)))
      .limit(1);

    return existing || null;
  }

  /**
   * Cache analysis result
   */
  private async cacheAnalysis(
    projectId: string,
    analysisType: AnalysisType,
    result: any,
    tokensUsed: number
  ): Promise<void> {
    await db.insert(analyses).values({
      projectId,
      analysisType,
      result: JSON.stringify(result),
      tokensUsed,
    });
  }
}

export const analysisService = new AnalysisService();
