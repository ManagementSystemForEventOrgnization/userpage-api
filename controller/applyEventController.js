const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');
const Event = mongoose.model('event');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');

const payment_Controller = require('../controller/payment_Controller');

module.exports = {
    updatePaymentStatus: async (req, res, next) => {
        if (typeof req.body.paymentId === 'undefined' ||
            typeof req.body.status === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { paymentId, status } = req.body;
        let userId = req.user;

        try {
            var currentPayment = await Payment.findById(paymentId);
            var currentApplyEvent = await ApplyEvent.findOne({ paymentId: paymentId });

            if (currentPayment) {
                currentPayment.status = status == true ? "PAID" : "FAILED";

                await currentPayment.save();

                if (status == true) {
                    currentApplyEvent.qrcode = userId
                    await currentApplyEvent.save();
                }

                return res.status(200).json({ result: true })
            } else {
                next({ error: { message: 'Not found this payment', code: 703 } });
            }
        } catch (err) {
            next(err);
        }
    },

    joinEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, joinTime, payType } = req.body;
        let userId = req.user;

        try {
            var currentEvent = await Event.findById(eventId);

            if (currentEvent) {
                if (currentEvent.userId == userId) {
                    next({ error: { message: 'Can not join in yourself event', code: 706 } });
                    return;
                }

                var joinNumber = +currentEvent.joinNumber || 0;
                joinNumber += 1;

                if (joinNumber > +currentEvent.limitNumber) {
                    next({ error: { message: 'Exceeded the amount possible', code: 700 } });
                    return;
                }

                currentEvent.joinNumber = joinNumber;

                var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId, joinTime: joinTime });

                if (currentApplyEvent) {
                    if (currentApplyEvent.qrcode != userId)
                        next({ error: { message: 'You have already joined in this event', code: 701 } });
                } else {
                    const newApplyEvent = new ApplyEvent({
                        userId: userId,
                        eventId: eventId,
                        joinTime: joinTime,
                        isConfirm: true,
                        createdAt: Date()
                    });

                    if (currentEvent.isSellTicket != true) {
                        newApplyEvent.qrcode = userId
                    }
                    // await newApplyEvent.save();
                    // await currentEvent.save();
                    Promise.all([
                        newApplyEvent.save(),
                        currentEvent.save()])
                        .then(([apply, current]) => {

                        }).catch(([err1, err2]) => {

                        })


                    if (currentEvent.isSellTicket) {
                        req.body.amount = currentEvent.ticket.price - currentEvent.ticket.discount * currentEvent.ticket.price;
                        req.body.receiver = currentEvent.userId;

                        if (payType === "CREDIT_CARD") {
                            await payment_Controller.create_charges(req, res, next);
                        } else {
                            await payment_Controller.create_order(req, res, next);
                        }
                    } else {
                        return res.status(200).json({ result: true })
                    }
                }
            } else {
                next({ error: { message: 'Event not exists', code: 403 } });
            }
        }
        catch (err) {
            next(err);
        }
    },

    prepayEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.payType === 'undefined' ||
            typeof req.body.joinTime === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, joinTime, payType } = req.body;
        let userId = req.user;

        try {
            var currentEvent = await Event.findById(eventId);
            var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId, joinTime: joinTime });

            if (currentEvent && currentApplyEvent) {
                req.body.amount = currentEvent.ticket.price - currentEvent.ticket.discount * currentEvent.ticket.price;
                req.body.receiver = currentEvent.userId;

                if (payType === "CREDIT_CARD") {
                    await payment_Controller.create_charges(req, res, next);
                } else {
                    await payment_Controller.create_order(req, res, next);
                }
            } else {
                next({ error: { message: 'Not found!', code: 707 } });
            }
        }
        catch (err) {
            next(err);
        }
    },

    verifyEventMember: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.joinUserId === 'undefined' ||
            typeof req.body.joinTime === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId, joinTime } = req.body;

        try {
            var currentApplyEvent = await ApplyEvent.findOne({ userId: joinUserId, eventId: eventId, joinTime: joinTime });

            if (currentApplyEvent) {
                if (currentApplyEvent.isReject != true && currentApplyEvent.qrcode == joinUserId) {
                    currentApplyEvent.isConfirm = true
                } else {
                    currentApplyEvent.isConfirm = false
                }
                await currentApplyEvent.save();

                if (currentApplyEvent.isConfirm) {
                    return res.status(200).json({ result: true });
                } else {
                    if (currentApplyEvent.isReject) {
                        next({ error: { message: 'Join user have rejected', code: 705 } });
                    } else {
                        next({ error: { message: 'Join user have not payment for this event', code: 704 } });
                    }
                }
            } else {
                next({ error: { message: 'Join user have not participated in this event', code: 702 } });
            }
        } catch (err) {
            next(err);
        }
    },

    rejectEventMenber: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.joinUserId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId } = req.body;
        let userId = req.user;

        try {
            var applyEvents = await ApplyEvent.find({ userId: joinUserId, eventId: eventId });
            var notification = await Notification.findOne({ sender: userId, "linkTo._id": eventId, receiver: joinUserId });

            if (notification) {
                next({ error: { message: 'you have rejected', code: 710 } });
            }

            for (var index in applyEvents) {
                applyEvents[index].isReject = true;

                await applyEvents[index].save();

                // await rejectEventMenberNoti(req, res, next);

                if (applyEvents[index].qrcode == joinUserId) {
                    req.body.paymentId = applyEvents[index].paymentId
                    await payment_Controller.refund(req, res, next);
                }
            }

            const newNotification = new Notification({
                sender: userId,
                receiver: [joinUserId],
                type: "EVENT_REJECT",
                message: "",
                title: "{sender} rejected you form event {event}",
                linkTo: {
                    key: "EventDetail",
                    _id: eventId,
                },
                isRead: false,
                isDelete: false,
                createdAt: Date()
            });

            await newNotification.save();

            return res.status(200).json({ result: true });
        } catch (err) {
            next(err);
        }
    },

    cancelEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, time } = req.body;
        let userId = req.user;

        try {
            var event = await Event.findById(eventId);
            var applyEvents = null;

            if (time) {
                event.cancelTime.push(time);
                const index = event.startTime.indexOf(time);

                if (index > -1) {
                    event.startTime.splice(index, 1);
                }

                applyEvents = await ApplyEvent.find({ eventId: eventId, joinTime: time });
            } else {
                event.isCancel = true;
                applyEvents = await ApplyEvent.find({ eventId: eventId });
            }

            var joinUserIds = [];
            for (var index in applyEvents) {
                applyEvents[index].isReject = true;

                await applyEvents[index].save();

                // await cancelJoinEventNoti(req, res, next);
                if (joinUserIds.indexOf(applyEvents[index].userId) === -1) {
                    joinUserIds.push(applyEvents[index].userId);
                }

                if (event.isSellTicket == true && applyEvents[index].qrcode == applyEvents[index].userId) {
                    req.body.paymentId = applyEvents[index].paymentId;
                    req.body.joinUserId = applyEvents[index].userId;

                    await payment_Controller.refund(req, res, next);
                }
            }

            const newNotification = new Notification({
                sender: userId,
                receiver: joinUserIds,
                type: "EVENT_CANCEL",
                message: "",
                title: "{sender} canceled event {event}",
                linkTo: {
                    key: "EventDetail",
                    _id: eventId,
                },
                isRead: false,
                isDelete: false,
                createdAt: Date()
            });

            await newNotification.save();
            await event.save();

            return res.status(200).json({ result: true });
        } catch (err) {
            next(err);
        }
    },

    rejectEventMenberNoti: async (req, res, next) => {

    },

    cancelJoinEventNoti: async (req, res, next) => {

    },

    getListApplyEvent: async (req, res, next) => {
        try {
            let applyEvents = await ApplyEvent.find({ userId: req.user });

            res.status(200).json({ result: applyEvents });
        } catch (err) {
            next({ error: { message: 'Lỗi không lấy được dữ liệu', code: 500 } });
        }

    }
}