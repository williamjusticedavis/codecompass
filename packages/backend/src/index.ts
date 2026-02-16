import { createServer } from './server';
import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './db';

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.execute('SELECT 1');
    logger.info('✓ Database connected successfully');

    // Create and start Express server
    const app = createServer();

    app.listen(env.port, () => {
      logger.info(`🚀 Server running on port ${env.port}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
