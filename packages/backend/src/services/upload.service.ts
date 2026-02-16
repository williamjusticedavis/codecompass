import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface ExtractOptions {
  zipFilePath: string;
  destinationPath: string;
}

export class UploadService {
  private readonly uploadsDir: string;
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Ensure uploads directory exists
   */
  private async ensureUploadsDir(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      logger.info('Creating uploads directory', { path: this.uploadsDir });
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Extract a zip file to a destination directory
   */
  async extractZipFile(options: ExtractOptions): Promise<string> {
    await this.ensureUploadsDir();

    const { zipFilePath, destinationPath } = options;
    const fullDestPath = path.join(this.uploadsDir, destinationPath);

    try {
      // Validate zip file exists
      const stats = await fs.stat(zipFilePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(
          `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
        );
      }

      // Check if destination already exists
      try {
        await fs.access(fullDestPath);
        logger.warn('Destination directory already exists, removing', { path: fullDestPath });
        await fs.rm(fullDestPath, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is what we want
      }

      logger.info('Extracting zip file', { zipFile: zipFilePath, destination: fullDestPath });

      // Create destination directory
      await fs.mkdir(fullDestPath, { recursive: true });

      // Extract zip file
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();

      // Validate zip contents (no absolute paths, no directory traversal)
      for (const entry of zipEntries) {
        const entryPath = entry.entryName;
        if (path.isAbsolute(entryPath) || entryPath.includes('..')) {
          throw new Error('Invalid zip file: contains unsafe file paths');
        }
      }

      // Extract all files
      zip.extractAllTo(fullDestPath, true);

      // Check if files are nested in a single root directory
      const entries = await fs.readdir(fullDestPath);
      if (entries.length === 1) {
        const singleEntry = entries[0];
        const singleEntryPath = path.join(fullDestPath, singleEntry);
        const singleEntryStat = await fs.stat(singleEntryPath);

        if (singleEntryStat.isDirectory()) {
          // Move contents up one level
          logger.info('Moving nested directory contents up', { dir: singleEntry });
          const tempDir = path.join(this.uploadsDir, `${destinationPath}_temp`);
          await fs.rename(singleEntryPath, tempDir);
          await fs.rmdir(fullDestPath);
          await fs.rename(tempDir, fullDestPath);
        }
      }

      // Delete the uploaded zip file
      await fs.unlink(zipFilePath);

      logger.info('Zip file extracted successfully', { path: fullDestPath });
      return fullDestPath;
    } catch (error) {
      logger.error('Failed to extract zip file', { zipFilePath, error });

      // Clean up on error
      try {
        await fs.rm(fullDestPath, { recursive: true, force: true });
        await fs.unlink(zipFilePath);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(
        `Failed to extract zip file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate uploaded file is a zip file
   */
  validateZipFile(filename: string, mimetype: string): boolean {
    const allowedMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
    ];

    const allowedExtensions = ['.zip'];
    const ext = path.extname(filename).toLowerCase();

    return allowedMimeTypes.includes(mimetype) || allowedExtensions.includes(ext);
  }

  /**
   * Delete uploaded project files
   */
  async deleteUpload(projectId: string): Promise<void> {
    const uploadPath = path.join(this.uploadsDir, projectId);

    try {
      await fs.rm(uploadPath, { recursive: true, force: true });
      logger.info('Upload deleted', { path: uploadPath });
    } catch (error) {
      logger.error('Failed to delete upload', { path: uploadPath, error });
      throw new Error('Failed to delete uploaded files');
    }
  }
}

export const uploadService = new UploadService();
