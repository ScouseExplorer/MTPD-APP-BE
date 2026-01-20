



async function getUserProgress(req,res,next){
    try{
        const userId = req.user.id;
        const progress = await progressService.getUserProgress(userId);
        return res.status(200).json({success:true, data:progress});
    } catch (error){
        next (error);
    }
}

async function markSectionComplete(req,res,next){
    try{
        const userId = req.user.id;
        const { sectionId } = req.body;
        const result = await progressService.markSectionComplete(userId, sectionId);
        return res.status(200).json({success:true, message:'Section marked as complete', data:result});
    } catch (error){
        next(error);
    }
} // review this logic 


// Get overall user progress,
//  mark section as complete, get completed items,
//  get statistics