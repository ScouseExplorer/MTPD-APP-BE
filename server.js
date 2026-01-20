const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');
const redis = require('./src/config/redis');

const PORT = process.env.PORT || 3000;

// Wait for a function to succeed
async function waitFor(fn, label, retries = 20, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try { await fn(); console.log(`✅ ${label} connected`); return true; }
    catch (e) { await new Promise(r => setTimeout(r, delayMs)); }
  }
  return false;
}

// Test database connection
async function testConnections() {
  const okDb = await waitFor(() => db.query('SELECT 1'), 'PostgreSQL');
  const okRedis = await waitFor(() => redis.ping(), 'Redis');
  return okDb && okRedis;
}

// Start server
const startServer = async () => {
  const connected = await testConnections();

  if (!connected) {
    console.error('Failed to connect to required services');
    process.exit(1);
  }

  const ENV = process.env.NODE_ENV || 'development';
  const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Environment: ${ENV}`);
    console.log(`🔗 API URL: ${API_URL}`);
  });
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await db.pool.end();
  await redis.quit();
  process.exit(0);
});

module.exports = app;
startServer();