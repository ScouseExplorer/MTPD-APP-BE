import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

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
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { user: { id: user.id, email: user.email, name: user.name }, token };
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

module.exports = { register, login, registerSchema, loginSchema };