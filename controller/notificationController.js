const mongoose = require('mongoose');
const Notification = mongoose.model('notification');


module.exports = {
    startEventNoti: async (req, res, next) => {
       
    },

    getBadgeNumber: async (req, res, next) => {
        let userId = req.body.userId; // req.user;
    },

    getListNotification: async (req, res, next) => {
        let { pageNumber, numberRecord } = req.body;
        
        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 10;

        let currentUserId = req.user;
    }    
}