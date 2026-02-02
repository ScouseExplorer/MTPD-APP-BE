-- Mobile App Specific Database Tables

-- Device Registration Table
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) UNIQUE NOT NULL, -- Unique device identifier
  device_name VARCHAR(255), -- "iPhone 15 Pro", "Samsung Galaxy S24"
  platform VARCHAR(50) NOT NULL, -- 'ios', 'android'
  platform_version VARCHAR(50), -- iOS version, Android API level
  app_version VARCHAR(50), -- App version
  push_token TEXT, -- FCM/APNS token for push notifications
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_logout TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Biometric Authentication Tokens
CREATE TABLE biometric_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) REFERENCES user_devices(device_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL, -- Hashed biometric token
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device-specific Refresh Tokens
CREATE TABLE device_refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) REFERENCES user_devices(device_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL, -- Hashed refresh token
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social Authentication Links
CREATE TABLE social_auth_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'apple', 'facebook'
  provider_id VARCHAR(255) NOT NULL, -- ID from social provider
  provider_email VARCHAR(255),
  provider_data JSONB, -- Additional data from provider
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
);

-- Push Notifications Log
CREATE TABLE push_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) REFERENCES user_devices(device_id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional notification data
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App-specific User Preferences
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  biometric_auth BOOLEAN DEFAULT FALSE,
  auto_login BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'system'
  language VARCHAR(10) DEFAULT 'en',
  study_reminders BOOLEAN DEFAULT TRUE,
  quiz_notifications BOOLEAN DEFAULT TRUE,
  progress_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offline Data Sync (for mobile offline capability)
CREATE TABLE sync_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) REFERENCES user_devices(device_id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'quiz_attempt', 'progress_update', 'bookmark'
  entity_type VARCHAR(50) NOT NULL, -- 'quiz', 'video', 'bookmark'
  entity_id INTEGER,
  data JSONB NOT NULL, -- The actual data to sync
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

-- App Usage Analytics (privacy-conscious)
CREATE TABLE app_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) REFERENCES user_devices(device_id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'app_open', 'quiz_started', 'video_watched'
  session_id VARCHAR(255),
  screen_name VARCHAR(100),
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for mobile-optimized queries
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX idx_user_devices_active ON user_devices(user_id, is_active);

CREATE INDEX idx_biometric_tokens_user_device ON biometric_tokens(user_id, device_id);
CREATE INDEX idx_biometric_tokens_expires ON biometric_tokens(expires_at);

CREATE INDEX idx_device_refresh_tokens_user_device ON device_refresh_tokens(user_id, device_id);
CREATE INDEX idx_device_refresh_tokens_hash ON device_refresh_tokens(token_hash);

CREATE INDEX idx_social_auth_provider ON social_auth_links(provider, provider_id);
CREATE INDEX idx_social_auth_user ON social_auth_links(user_id);

CREATE INDEX idx_push_notifications_user_device ON push_notifications(user_id, device_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);

CREATE INDEX idx_sync_queue_user_device ON sync_queue(user_id, device_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);

CREATE INDEX idx_app_analytics_user_device ON app_analytics(user_id, device_id);
CREATE INDEX idx_app_analytics_event ON app_analytics(event_type);
CREATE INDEX idx_app_analytics_created ON app_analytics(created_at);

-- Add mobile-specific columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_time_minutes INTEGER DEFAULT 0;

-- Cleanup procedures for mobile tokens
-- These should be run periodically via cron jobs
-- DELETE FROM biometric_tokens WHERE expires_at < NOW() OR is_active = FALSE;
-- DELETE FROM device_refresh_tokens WHERE expires_at < NOW() OR is_revoked = TRUE;
-- DELETE FROM sync_queue WHERE status = 'synced' AND created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM app_analytics WHERE created_at < NOW() - INTERVAL '90 days';