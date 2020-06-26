const mongoose = require('mongoose');
const Notification = mongoose.model('notification');
const ObjectId = mongoose.Types.ObjectId;
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
        let { pageNumber, numberRecord } = req.query;
        let idUser = req.user;
        pageNumber = +pageNumber || 1;
        numberRecord = +numberRecord || 10;
        let condition = {receiver: ObjectId(idUser), isDelete: {$eq: false}};

        try {
            let notifications =  await Notification.aggregate([
                { $match: condition },
                {
                    $lookup:
                    {
                        from: "users",
                        localField: "receiver",
                        foreignField: "_id",
                        as: "users_receiver"
                    }
                },
                {
                    $unwind: "$users_receiver"
                },
                {
                    $lookup:
                    {
                        from: "users",
                        localField: "sender",
                        foreignField: "_id",
                        as: "users_sender"
                    }
                },
                {
                    $unwind: "$users_sender"
                },
                { $sort: { createdAt: -1 } },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: numberRecord }
            ]);
            res.status(200).json({ result: notifications });
        } catch (err) {
            next({ error: { message: 'Lỗi không lấy được dữ liệu', code: 500 } });
        }
    }    
}