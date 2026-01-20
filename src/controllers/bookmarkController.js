const express = require('express');
const router = express.Router();


const bookmarkService = require('../services/bookmarkService');
const { validateRequest } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const createError = require('http-errors'); // optional helper for errors
const logger = require('../utils/logger'); // optional


async function addBookmark(req,res,next){
    try{
        const Userid = req.user.id;
        const { itemId } = req.body;
        const result = await bookmarkService.addBookmark(Userid, itemId);
        return res.status(200).json({success:true, data:result});
    } catch (error) {
        next(error);
    }
}

async function removeBookmark(req,res){
    try{
        const Userid = req.user.id;
        const { itemId } = req.params;
        const result = await bookmarkServices.removeBookmark(Userid, itemId);
        return res.status(200).json({success:true, message:'Bookmark removed'});
    } catch (error){
        res.status(500).json({success:false, message:'Server Error'});
    }
}

async function getUserBookmarks(req,res){
    try{
        const Userid = req.user.id;
        const bookmarks = await bookmarkService.getUserBookmarks(Userid);
        return res.status(200).json({success:true, data:bookmarks});
    } catch (error){
        res.status(500).json({success:false, message:'Server Error'});
    }
}

async function clearBookmarks(req,res){
    try{
        const userId = req.user.id;
        const result = await bookmarkService.clearBookmarks(userId);
        // add an if else statement to re ask the user if they really want to do this 
        return res.status(200).json({success:true, message:'All bookmarks cleared'});

    } catch (error){
        res.status(500).json({success:false, message:'Server Error'});
    }
}


module.exports = {
    addBookmark,
    removeBookmark,
    getUserBookmarks,
    clearBookmarks
};


//Add bookmark, remove bookmark, get user's bookmarks