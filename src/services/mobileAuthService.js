import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';
const DEVICE_TOKEN_EXPIRES = process.env.DEVICE_TOKEN_EXPIRES || '90d';
const BIOMETRIC_TOKEN_EXPIRES = process.env.BIOMETRIC_TOKEN_EXPIRES || '7d';

class MobileAuthService {
    
    // Mobile-specific login with device registration
    async loginWithDevice(credentials, deviceInfo) {
        const { email, password } = credentials;
        const { deviceId, deviceName, platform, version, pushToken } = deviceInfo;
        
        // Validate credentials (reuse existing logic)
        const user = await this.validateCredentials(email, password);
        
        // Register or update device
        await this.registerDevice(user.id, {
            deviceId,
            deviceName,
            platform,
            version,
            pushToken,
            lastLogin: new Date()
        });
        
        // Generate mobile-optimized tokens
        const tokens = this.generateMobileTokens(user, deviceId);
        
        // Log security event
        await this.logSecurityEvent(user.id, 'mobile_login', {
            deviceId,
            platform,
            deviceName
        });
        
        return {
            user: this.sanitizeUser(user),
            ...tokens,
            deviceId
        };
    }
    
    // Generate tokens optimized for mobile
    generateMobileTokens(user, deviceId) {
        const payload = {
            id: user.id,
            email: user.email,
            deviceId,
            type: 'access'
        };
        
        const refreshPayload = {
            id: user.id,
            deviceId,
            type: 'refresh'
        };
        
        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
        
        return {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES,
            tokenType: 'Bearer'
        };
    }
    
    // Device-specific refresh token
    async refreshMobileTokens(refreshToken, deviceId) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            
            if (decoded.type !== 'refresh' || decoded.deviceId !== deviceId) {
                throw new Error('Invalid refresh token');
            }
            
            // Verify device is still registered
            const device = await this.getRegisteredDevice(decoded.id, deviceId);
            if (!device || !device.isActive) {
                throw new Error('Device not registered or inactive');
            }
            
            const user = await User.findOne({ id: decoded.id });
            if (!user) throw new Error('User not found');
            
            // Generate new tokens
            const tokens = this.generateMobileTokens(user, deviceId);
            
            // Update device last activity
            await this.updateDeviceActivity(decoded.id, deviceId);
            
            return {
                ...tokens,
                user: this.sanitizeUser(user)
            };
        } catch (error) {
            const err = new Error('Invalid refresh token');
            err.status = 401;
            throw err;
        }
    }
    
    // Biometric authentication setup
    async setupBiometric(userId, deviceId, biometricData) {
        const biometricToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + this.parseDuration(BIOMETRIC_TOKEN_EXPIRES));
        
        await this.storeBiometricToken(userId, deviceId, biometricToken, expires);
        
        return {
            biometricToken,
            expiresAt: expires
        };
    }
    
    // Biometric login
    async loginWithBiometric(biometricToken, deviceId) {
        const biometric = await this.getBiometricToken(biometricToken, deviceId);
        
        if (!biometric || biometric.expiresAt < new Date()) {
            const err = new Error('Invalid or expired biometric token');
            err.status = 401;
            throw err;
        }
        
        const user = await User.findOne({ id: biometric.userId });
        if (!user) throw new Error('User not found');
        
        // Generate short-lived session token for biometric login
        const sessionToken = jwt.sign(
            { id: user.id, deviceId, type: 'biometric' },
            JWT_SECRET,
            { expiresIn: BIOMETRIC_TOKEN_EXPIRES }
        );
        
        return {
            sessionToken,
            user: this.sanitizeUser(user),
            expiresIn: BIOMETRIC_TOKEN_EXPIRES
        };
    }
    
    // Device management
    async registerDevice(userId, deviceInfo) {
        const device = {
            userId,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            platform: deviceInfo.platform,
            version: deviceInfo.version,
            pushToken: deviceInfo.pushToken,
            isActive: true,
            lastLogin: deviceInfo.lastLogin || new Date(),
            createdAt: new Date()
        };
        
        // TODO: Store in database
        console.log('Device registered:', device);
        return device;
    }
    
    async getRegisteredDevices(userId) {
        // TODO: Get from database
        // return await Device.find({ userId, isActive: true });
        return []; // Placeholder
    }
    
    async revokeDevice(userId, deviceId) {
        // TODO: Update database
        // await Device.updateOne({ userId, deviceId }, { isActive: false });
        
        // Invalidate all tokens for this device
        await this.invalidateDeviceTokens(userId, deviceId);
        
        console.log(`Device ${deviceId} revoked for user ${userId}`);
    }
    
    // Push notification helpers
    async updatePushToken(userId, deviceId, pushToken) {
        // TODO: Update in database
        console.log(`Push token updated for user ${userId}, device ${deviceId}`);
    }
    
    async sendSecurityAlert(userId, event, deviceInfo) {
        const devices = await this.getRegisteredDevices(userId);
        
        for (const device of devices) {
            if (device.pushToken && device.deviceId !== deviceInfo?.deviceId) {
                // Send push notification to other devices about security event
                await this.sendPushNotification(device.pushToken, {
                    title: 'Security Alert',
                    body: `${event} detected on ${deviceInfo?.deviceName || 'unknown device'}`,
                    data: { type: 'security_alert', event }
                });
            }
        }
    }
    
    // Social auth for mobile (Google/Apple)
    async socialLogin(provider, token, deviceInfo) {
        let userProfile;
        
        switch (provider) {
            case 'google':
                userProfile = await this.verifyGoogleToken(token);
                break;
            case 'apple':
                userProfile = await this.verifyAppleToken(token);
                break;
            default:
                throw new Error('Unsupported social provider');
        }
        
        // Find or create user
        let user = await User.findOne({ email: userProfile.email });
        
        if (!user) {
            user = await User.create({
                email: userProfile.email,
                name: userProfile.name,
                avatar: userProfile.picture,
                socialProvider: provider,
                socialId: userProfile.id,
                isEmailVerified: true // Social logins are pre-verified
            });
        }
        
        // Register device and generate tokens
        return await this.loginWithDevice({ skipPasswordCheck: true }, deviceInfo, user);
    }
    
    // Mobile-specific logout
    async logoutFromDevice(userId, deviceId, pushToken = null) {
        // Update device status
        await this.updateDeviceStatus(userId, deviceId, { lastLogout: new Date() });
        
        // Clear push token if provided
        if (pushToken) {
            await this.clearPushToken(userId, deviceId);
        }
        
        // Invalidate tokens for this specific device
        await this.invalidateDeviceTokens(userId, deviceId);
        
        return { success: true };
    }
    
    // Helper methods (placeholder implementations)
    async validateCredentials(email, password) {
        // Reuse existing auth logic
        return { id: 1, email, name: 'Test User' }; // Placeholder
    }
    
    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    }
    
    parseDuration(duration) {
        // Simple duration parser for JWT expiration
        const unit = duration.slice(-1);
        const value = parseInt(duration.slice(0, -1));
        
        switch (unit) {
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            default: return value;
        }
    }
    
    // Placeholder methods for database operations
    async getRegisteredDevice(userId, deviceId) { return null; }
    async updateDeviceActivity(userId, deviceId) { }
    async storeBiometricToken(userId, deviceId, token, expires) { }
    async getBiometricToken(token, deviceId) { return null; }
    async invalidateDeviceTokens(userId, deviceId) { }
    async updateDeviceStatus(userId, deviceId, status) { }
    async clearPushToken(userId, deviceId) { }
    async sendPushNotification(token, payload) { }
    async verifyGoogleToken(token) { return {}; }
    async verifyAppleToken(token) { return {}; }
    async logSecurityEvent(userId, event, metadata) { }
}

export default new MobileAuthService();