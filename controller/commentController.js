const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Comment = mongoose.model('comment');
const Axios = require('axios');

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
            { $match: { eventId: ObjectId(eventId) } },
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
            { $sort: { createdAt: -1 } },
            { $skip: +numberRecord * (+pageNumber - 1) },
            { $limit: +numberRecord }
        ]);
        res.status(200).json({ result: comment });
    },

    saveComment: async (req, res, next) => {
        let {
            eventId,
            content,
        } = req.body;


        let userId = req.user;

        let comment = new Comment({
            eventId, content, userId
        });
        let cmt = await comment.save();
        let c = await Comment.findById(cmt._id).populate({ path: "userId", select: ['fullName', 'avatar'] });

        Axios.post('https://event-chat.herokuapp.com/api/post/comment',
        {
                eventId: eventId,
                cmt: c            
        });

        res.status(200).json({ result: c });

    },




}