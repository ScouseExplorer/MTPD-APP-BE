#!/usr/bin/env node

/**
 * Security Setup Script
 * Generates secure random secrets for JWT and session management
 * Run this script to generate production-ready secrets
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔐 Security Setup - Generating Secure Secrets\n');
console.log('=' .repeat(60));

// Generate secrets
const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('\n✅ Generated Secrets (copy these to your .env file):\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:\n');
console.log('1. Never commit your .env file to version control');
console.log('2. Use different secrets for development and production');
console.log('3. Rotate your secrets periodically (every 90 days recommended)');
console.log('4. Store production secrets in a secure vault (Azure Key Vault, AWS Secrets Manager, etc.)');
console.log('5. Ensure JWT_EXPIRES is short (15m recommended) for access tokens');
console.log('6. Use longer expiry (7d) for refresh tokens');
console.log('\n' + '='.repeat(60));

// Optionally update .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('\n📝 Would you like to update your .env file with these secrets?');
  console.log('   (Manual update recommended for production)\n');
} else {
  console.log('\n📝 Create a .env file and add these secrets');
  console.log('   You can use .env.example as a template\n');
}
