const mongoose = require('mongoose');
const Notification = mongoose.model('notification');

module.exports = {
    startEventNoti: async (req, res, next) => {
       
    },

    setReadNotification: async (req, res, next) => {
        if (typeof req.body.notificationId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { notificationId } = req.body;
        let userId = req.user;

        try {
            let notification = await Notification.findById(notificationId);
            notification.isRead = true;

            await notification.save();
            return res.status(200).json({ result: true });
        } catch (err) {
            next(err);
        }
    },

    setDeleteNotification: async (req, res, next) => {
        if (typeof req.body.notificationId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { notificationId } = req.body;
        let userId = req.user;

        try {
            let notification = await Notification.findById(notificationId);
            notification.isDelete = true;

            await notification.save();
            return res.status(200).json({ result: true });
        } catch (err) {
            next(err);
        }
    },

    getBadgeNumber: async (req, res, next) => {
        let userId = req.user;

        try {
            let notifications = await Notification.find({receiver: userId, isRead: false, isDelete: false});
            return res.status(200).json({ result: notifications.length });
        } catch (err) {
            next(err);
        }
    },

    getListNotification: async (req, res, next) => {
        // let { pageNumber, numberRecord } = req.query;
        
        // pageNumber = pageNumber || 1;
        // numberRecord = numberRecord || 10;

        try {
            let notìications = await Notification.find();

            res.status(200).json({ result: notìications });
        } catch (err) {
            next({ error: { message: 'Lỗi không lấy được dữ liệu', code: 500 } });
        }
    }    
}