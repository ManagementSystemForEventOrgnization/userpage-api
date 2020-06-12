const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Chat = mongoose.model('chat');

module.exports = {

    getList: async (req, res, next) => {
        let {
            sender,
            pageNumber,
            numberRecord,
        } = req.query;

        sender = sender || req.users;
        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 50;

        let c = await Chat.find({ $or: [{ sender: sender }, { receiver: sender }] })
                        .sort({createdAt: -1})
                        .skip((+pageNumber - 1) * numberRecord).limit(+numberRecord)
                        
                        // c.reverse();
        res.status(200).json({ result: c });
    },

    saveChat: async (req, res, next) => {
        let {
            sender,
            receiver,
            fullName,
            content,
        } = req.body;
        sender = sender || req.users;

        let chat = new Chat({
            sender,
            receiver,
            fullName,
            content
        })

        await chat.save();

        res.status(200).json({ result: chat });

    },



}