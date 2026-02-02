import express from 'express';
const  router = express.Router();
import categoryService from '../services/categoryService.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import rateLimiter from '../middleware/rateLimiter.js';
import createError from 'http-errors';
import logger from '../utils/logger.js';
import paginate from '../utils/paginate.js';
import pg from '../config/database.js';


async function getAllCategories(req, res, next) {
  // query: page, limit, type, q, sort
  // call categoryService.list({ page, limit, type, q, sort })
}

async function getCategoryById(req, res, next) {
  // req.params.id or req.params.slug
  // call categoryService.getById(id)
}

async function createCategory(req, res, next) {
  // authorize admin
  // validate body
  // call categoryService.create(req.body)
}

async function updateCategory(req, res, next) {
  // authorize admin
  // validate body/params
  // call categoryService.update(id, req.body)
}

async function deleteCategory(req, res, next) {
  // authorize admin
  // call categoryService.delete(id)
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};


// Get all categories for quizzes/videos/highway code sections