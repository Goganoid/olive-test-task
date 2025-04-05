import dotenv from 'dotenv';
import 'reflect-metadata';
dotenv.config();

import { AppDataSource } from './database/config.js';
import { getMediaRoutes } from './routes/media.routes.js';
import { createServer, RouteConfig } from './server/index.js';
import { logger } from './utils/logger.js';

const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    logger.log('Database connection established');
    await AppDataSource.runMigrations();
    logger.log('Migrations executed successfully');
  } catch (error) {
    logger.error('Error during database initialization:', error);
    process.exit(1);
  }
};

const routeConfig: RouteConfig = {
  routes: [...getMediaRoutes()],
};

// Initialize database and start server
initializeDatabase().then(() => {
  const server = createServer(routeConfig);
  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    logger.log(`Server running on port ${PORT}`);
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT signal received. Shutting down...');
    server.close(() => {
      logger.log('Server closed.');
      AppDataSource.destroy().then(() => {
        logger.log('Database connection closed.');
        process.exit(0);
      });
    });
  });
});
