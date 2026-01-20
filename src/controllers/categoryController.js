const express = require('express');
const router = express.Router();
const categoryService = require('../services/categoryService');
const { validateRequest } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const createError = require('http-errors');
const logger = require('../utils/logger');
const paginate = require('../utils/paginate');


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