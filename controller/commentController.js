const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Comment = mongoose.model('comment');

module.exports = {
    getList: async (req, res, next) => {
        let {
            eventId,
            pageNumber,
            numberRecord,
        } = req.query;

        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 5;

        let comment = await Comment.aggregate([
            { $match: { eventId: eventId } },
            {
                $lookup:
                {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "usersComment"
                }
            },
            {
                $unwind: "$usersComment"
            },
            { $skip: +numberRecord * (+pageNumber - 1) },
            { $limit: numberRecord },
            { $sort: { createdAt: -1 } }
        ]);
        // c.reverse();
        res.status(200).json({ result: comment });
    },

    saveComment: async (req, res, next) => {
        let {
            eventId,
            content,
        } = req.body;
        

        let userId = req.user;

        let comment = new Comment({
            eventId,content,userId
        });

        await comment.save();

        res.status(200).json({ result: comment });

    },



}