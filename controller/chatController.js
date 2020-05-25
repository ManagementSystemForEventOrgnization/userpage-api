const mongoose = require('mongoose');
const Chat = mongoose.model('chat');

module.exports = {

    getList: async (req, res, next) => {
        let {
            sender,
            receive,
            content,
            pageNumber,
            numberRecord,
        } = req.query;


        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 50;

        Chat


    },

    saveChat: async (req, res, next) => {
        let {
            sender,
            receive,
            content,
            pageNumber,
            numberRecord,
        } = req.query;
    },



}