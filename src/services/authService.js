import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

async function register(payload) {
  const { error } = registerSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  const { email, password, name } = payload;
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('User already exists');
    err.status = 409;
    throw err;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, name });
  const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
  
  // TODO: Store refresh token in database
  // await storeRefreshToken(user.id, refreshToken);
  
  return { 
    user: { id: user.id, email: user.email, name: user.name }, 
    accessToken,
    refreshToken 
  };
}

async function login(payload) {
  const { error } = loginSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  const { email, password } = payload;
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password || '');
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

// Refresh token functionality
async function refreshTokens(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // TODO: Verify refresh token exists in database
    // const storedToken = await getRefreshToken(decoded.id, refreshToken);
    // if (!storedToken) throw new Error('Refresh token not found');
    
    const user = await User.findOne({ id: decoded.id });
    if (!user) {
      throw new Error('User not found');
    }
    
    const newAccessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
    
    // TODO: Replace old refresh token with new one
    // await replaceRefreshToken(decoded.id, refreshToken, newRefreshToken);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, name: user.name }
    };
  } catch (error) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
}

module.exports = { register, login, refreshTokens, registerSchema, loginSchema };