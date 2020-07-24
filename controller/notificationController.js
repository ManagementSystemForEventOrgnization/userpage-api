const mongoose = require('mongoose');
const Notification = mongoose.model('notification');
const ObjectId = mongoose.Types.ObjectId;
var schedule = require('node-schedule');
const { adminId } = require('../config/key');
const Event = mongoose.model('event');
const ApplyEvent = mongoose.model('applyEvent');
const { formatDate } = require('../utils/helpers');

module.exports = {
    startEventNoti: async () => {
        var rule = new schedule.RecurrenceRule();
        rule.hour = 21;
        rule.minute = 00;
        rule.second = 00;

        schedule.scheduleJob(rule, async function () {
            let currentDay = new Date();
            let nextDay = new Date(new Date().getTime() + 86400 * 1000);

            Promise.all([
                ApplyEvent.aggregate([
                    {
                        $match: {
                            session: {
                                $elemMatch: {
                                    isReject: false
                                    , isCancel: { $ne: true }
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "events",
                            let: { event_id: "$eventId" },
                            pipeline: [
                                {
                                    $match: {
                                        status: 'PUBLIC',
                                        $expr: {
                                            $and: [
                                                { $eq: ["$_id", "$$event_id"] }
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: "event",
                        },
                    },
                    { $unwind: '$event' },
                    {
                        $project: {
                            'session': {
                                $filter: {
                                    input: "$session",
                                    as: "item",
                                    cond: {
                                        $and: [
                                            {
                                                $not: { $eq: ["$$item.isCancel", true], $eq: ["$$item.isReject", true] }
                                            },
                                            {
                                                $gte: ["$$item.day", currentDay]
                                            },
                                            {
                                                $lte: ["$$item.day", nextDay]
                                            }
                                        ]
                                    }
                                },
                            },
                            eventId: 1, userId: 1, event: 1
                        }
                    },
                    { $match: { session: { $not: { $size: 0 } } } },
                ])
            ]).then((applies) => {
                applies[0].forEach(apply => {
                    const { event } = apply
                    let dayString = formatDate(apply.session[0].day).toLowerCase();

                    const newNotification = new Notification({
                        sender: adminId,
                        receiver: [apply.userId],
                        type: "EVENT_START",
                        message: "",
                        title: `Event ${event.name} will start ${dayString}`,
                        linkTo: {
                            key: "EventDetail",
                            _id: event._id,
                            urlWeb: event.urlWeb
                        },
                        isRead: false,
                        isDelete: false,
                        session: [apply.session[0].id]
                    });

                    newNotification.save();
                })
            }).catch((err) => {
                console.log(err)
            })
        })
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
            next({ error: { message: "Something went wrong", code: 776 } });
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
            next({ error: { message: "Something went wrong", code: 776 } });
        }
    },

    getBadgeNumber: async (req, res, next) => {
        let userId = req.user;

        try {
            let notifications = await Notification.find({ receiver: userId, isRead: false, isDelete: false });
            return res.status(200).json({ result: notifications.length });
        } catch (err) {
            next({ error: { message: "Something went wrong", code: 776 } });
        }
    },

    getListNotification: async (req, res, next) => {
        let { pageNumber, numberRecord } = req.query;
        let idUser = req.user;
        pageNumber = +pageNumber || 1;
        numberRecord = +numberRecord || 10;
        let condition = { receiver: ObjectId(idUser), isDelete: { $eq: false } };

        try {
            let notifications = await Notification.aggregate([
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