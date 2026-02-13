# 🚀 Quick Start Guide

## Prerequisites
- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- Redis (optional, recommended for production)

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Secure Secrets
```bash
node scripts/generate-secrets.js
```

Copy the generated secrets and update your `.env` file:

```env
JWT_SECRET=<generated_secret_1>
JWT_REFRESH_SECRET=<generated_secret_2>
SESSION_SECRET=<generated_secret_3>
```

### 3. Configure Database
Update your `.env` file with database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=mtpdb
```

### 4. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mtpdb;

# Exit
\q
```

### 5. Run Migrations
```bash
npm run migrate
```

This will create all necessary tables:
- users
- refresh_tokens
- email_verification_tokens
- password_reset_tokens
- token_blacklist
- security_audit_log
- login_attempts
- user_sessions

### 6. Configure Email (Optional)
For email verification and password reset emails:

```env
EMAIL_SERVICE=resend
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=your_resend_api_key
```

### 7. Configure Redis (Optional)
For improved performance with token blacklisting:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 8. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ PostgreSQL connected
⚠️  Redis not available (using database fallback)  # If Redis not configured
🚀 Server running on http://localhost:3000
```

### 9. Test the API

#### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#",
    "name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#"
  }'
```

#### Get current user (use token from login response)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 10. Run Tests
```bash
# Run authentication security tests
npm test src/test/auth_audit.test.js
```

## Common Issues

### Issue: "Cannot use import statement outside a module"
**Solution:** Make sure `package.json` has `"type": "module"` ✅ (Already configured)

### Issue: Database connection failed
**Solution:** 
1. Check PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
2. Verify credentials in `.env`
3. Ensure database exists

### Issue: Migration failed
**Solution:**
```bash
# Check migration status
npm run migrate -- list

# Rollback if needed
npm run migrate:down

# Try again
npm run migrate
```

### Issue: Redis connection timeout
**Solution:** Redis is optional. The system will automatically fall back to database operations. To disable Redis warnings, remove Redis-related env vars.

### Issue: Email not sending
**Solution:**
1. Verify RESEND_API_KEY is correct
2. Check EMAIL_FROM is a verified domain
3. Emails will be logged to console in development mode

## Environment Variables Reference

### Required
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=mtpdb

# JWT Secrets (MUST CHANGE IN PRODUCTION!)
JWT_SECRET=your_generated_secret_min_64_chars
JWT_REFRESH_SECRET=your_generated_refresh_secret_min_64_chars
```

### Optional (Recommended)
```env
# JWT Expiry
JWT_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Redis (for better performance)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Service
EMAIL_SERVICE=resend
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=your_api_key

# Security
SESSION_SECRET=your_session_secret
CORS_ORIGIN=http://localhost:3001

# Server
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
```

## Project Structure
```
MTPD-BE/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middlewares/      # Auth, validation, etc.
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── validators/       # Input validation
│   ├── database/         # DB connection
│   ├── config/           # Configuration
│   ├── utils/            # Helper functions
│   └── test/             # Test files
├── db/
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
├── .env                  # Environment variables (don't commit!)
├── .env.example          # Template for .env
├── package.json
└── server.js             # Entry point
```

## Next Steps

1. ✅ Test all endpoints with Postman or curl
2. ✅ Run the test suite to verify everything works
3. ✅ Customize email templates in `src/services/emailService.js`
4. ✅ Review security settings in `.env`
5. ✅ Set up OAuth providers (Google, etc.) if needed
6. ✅ Configure production environment
7. ✅ Set up CI/CD pipeline
8. ✅ Deploy to production

## Getting Help

- Check `AUTH_IMPLEMENTATION.md` for detailed documentation
- Review test files for usage examples
- Check `.env.example` for all configuration options
- Look at controller files for API endpoint implementations

## Security Reminders

⚠️ **NEVER**:
- Commit `.env` file to git
- Use default secrets in production
- Disable security features
- Store passwords in plaintext
- Expose database credentials

✅ **ALWAYS**:
- Use HTTPS in production
- Rotate secrets regularly
- Monitor security logs
- Keep dependencies updated
- Follow principle of least privilege

---

**Ready to go!** 🎉

Start the server with `npm run dev` and begin testing!