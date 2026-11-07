import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<typeof mongoose | undefined> {
  const mongoUri = process.env['MONGO_URI'];
  if (!mongoUri) {
    logger.error('db.config', 'MONGO_URI is not defined in environment variables');
    return undefined;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    logger.info('db.connected', 'MongoDB connected successfully via Mongoose', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    mongoose.connection.on('error', (err: unknown) => {
      logger.error('db.error', 'MongoDB connection runtime error', { error: err });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('db.disconnected', 'MongoDB disconnected from database server');
    });

    return conn;
  } catch (err: unknown) {
    logger.error('db.connect_failed', 'MongoDB initial connection failed', { error: err });
    throw err;
  }
}
