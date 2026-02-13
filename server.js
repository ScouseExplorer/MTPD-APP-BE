import dotenv from 'dotenv';
import app from './src/app.js';
import { pool } from './src/database/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Wait for a function to succeed
async function waitFor(fn, label, retries = 20, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try { 
      await fn(); 
      console.log(`✅ ${label} connected`); 
      return true; 
    }
    catch (e) { 
      console.log(`⏳ Waiting for ${label}... (attempt ${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delayMs)); 
    }
  }
  console.error(`❌ Failed to connect to ${label}`);
  return false;
}

// Test database connection
async function testConnections() {
  const okDb = await waitFor(() => pool.query('SELECT 1'), 'PostgreSQL');
  
  // Redis is optional - don't fail if it's not available
  let redisAvailable = false;
  try {
    const Redis = await import('ioredis');
    const redisClient = new Redis.default({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: () => null
    });
    await redisClient.ping();
    console.log('✅ Redis connected');
    redisAvailable = true;
    redisClient.disconnect();
  } catch (e) {
    console.log('⚠️  Redis not available (using database fallback)');
  }
  
  return okDb;
}

// Start server
const startServer = async () => {
  const connected = await testConnections();

  if (!connected) {
    console.error('❌ Failed to connect to required services');
    process.exit(1);
  }

  const ENV = process.env.NODE_ENV || 'development';
  const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Environment: ${ENV}`);
    console.log(`🔗 API URL: ${API_URL}`);
    console.log('='.repeat(60) + '\n');
  });
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  process.exit(0);
});

startServer();