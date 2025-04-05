import { DataSource } from 'typeorm';
import { MediaMetadata } from '../entities/MediaMetadata.js';
import dotenv from 'dotenv';

dotenv.config();
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'meta_db',
  synchronize: false, // We'll use migrations instead
  logging: true,
  migrationsRun: true,
  entities: [MediaMetadata],
  migrations: ['./dist/database/migrations/*.js'],
  migrationsTableName: 'migrations',
});
