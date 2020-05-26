const mongoose = require('mongoose');
const ObjectId  = mongoose.Types.ObjectId;
const Chat = mongoose.model('chat');

module.exports = {

    getList: async (req, res, next) => {
        let {
            sender,
            content,
            pageNumber,
            numberRecord,
        } = req.query;


        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 50;

        let c = await Chat.find({$or: [{sender : ObjectId(sender)}, {receiver: ObjectId(sender)}]}).skip((+pageNumber -1)*numberRecord).limit(+numberRecord);

        req.status(200).json({result: c});
    },

    saveChat: async (req, res, next) => {
        let {
            sender,
            receive,
            content,
            pageNumber,
            numberRecord,
        } = req.body;

        

    },



}