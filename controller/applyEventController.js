const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');
const Event = mongoose.model('event');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');

const ObjectId = mongoose.Types.ObjectId;

const payment_Controller = require('../controller/payment_Controller');
const FreePaymentId = "FreeTicket"

module.exports = {
    updatePaymentStatus: async (req, res, next) => {
        if (typeof req.body.paymentId === 'undefined' ||
            typeof req.body.status === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { paymentId, status } = req.body;

        try {
            var currentPayment = await Payment.findById(paymentId);

            if (currentPayment) {
                currentPayment.status = status == true ? "PAID" : "FAILED";
                await currentPayment.save();

                return res.status(200).json({ result: true })
            } else {
                next({ error: { message: 'Not found this payment', code: 703 } });
            }
        } catch (err) {
            next(err);
        }
    },

    joinEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.sessionIds === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, sessionIds, payType } = req.body;
        let userId = req.user;

        try {
            let currentEvent = await Event.findById(eventId);

            if (currentEvent) {
                if (currentEvent.userId == userId) {
                    next({ error: { message: 'Can not join in yourself event', code: 706 } });
                    return;
                }
                if (currentEvent.status === "CANCEL") {
                    next({ error: { message: 'Event cancelled', code: 719 } });
                    return;
                }

                var sessions = []

                currentEvent.session.forEach(element => {
                    if (sessionIds.includes(element.id)) {
                        if (element.isCancel == true) {
                            next({ error: { message: 'Some session cancelled, can you reload and choose again', code: 718 } });
                            return;
                        }

                        var joinNumber = element.joinNumber || 0;
                        joinNumber += 1;

                        if (joinNumber <= element.limitNumber) {
                            element.joinNumber = joinNumber;
                            sessions.push(element);
                        } else {
                            next({ error: { message: 'Exceeded the amount possible', code: 700 } });
                            return;
                        }
                    }
                })

                let currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

                if (sessions.length == 0 || sessions.length != sessionIds.length) {
                    next({ error: { message: 'Not found session!', code: 725 } });
                    return
                }

                var updateSession = async function () {
                    await Event.findByIdAndUpdate({ _id: currentEvent._id }, { session: currentEvent.session })

                    sessions.forEach(element => {
                        element.status = "JOINED"
                        element.isConfirm = false
                        element.isReject = false

                        if (currentEvent.isSellTicket != true) {
                            element.paymentId = FreePaymentId
                        }
                    })
                }

                if (currentApplyEvent) {
                    currentApplyEvent.session.forEach(element => {
                        if (sessionIds.includes(element.id)) {
                            next({ error: { message: 'You have already joined in one of these session', code: 701 } });
                        }
                    })

                    await updateSession()
                    let changeSession = currentApplyEvent.session.concat(sessions)

                    await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: changeSession })
                } else {
                    await updateSession()

                    let newApplyEvent = new ApplyEvent({
                        userId: userId,
                        eventId: eventId,
                        session: sessions,
                        qrcode: userId,
                        createdAt: Date()
                    });

                    await newApplyEvent.save();
                }

				const newNotification = new Notification({
                    sender: userId,
                    receiver: [currentEvent.userId],
                   	type: "JOINED_EVENT",
                    message: "",
                    title: "{sender} joined your event " + currentEvent.name,
                    linkTo: {
                        key: "EventDetail",
                        _id: eventId,
                    },
                    isRead: false,
                    isDelete: false,
                    createdAt: Date(),
                    session: sessionIds
                });
                
                newNotification.save();

                if (currentEvent.isSellTicket) {
                    req.body.amount = (currentEvent.ticket.price - currentEvent.ticket.discount * currentEvent.ticket.price) * sessions.length;
                    req.body.receiver = currentEvent.userId;

                    if (payType === "CREDIT_CARD") {
                        await payment_Controller.create_charges(req, res, next);
                    } else {
                        await payment_Controller.create_order(req, res, next);
                    }
                } else {
                    return res.status(200).json({ result: true })
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
            typeof req.body.sessionIds === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, sessionIds, payType } = req.body;
        let userId = req.user;

        try {
            var currentEvent = await Event.findById(eventId);
            var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });
            var count = 0

            currentApplyEvent.session.forEach(element => {
                if (sessionIds.includes(element.id)) {
                    count += 1;
                }
            })

            if (count != sessionIds.length) {
                next({ error: { message: 'Choose session pay failed, please!', code: 720 } })
            }

            if (currentEvent && currentApplyEvent) {
                req.body.amount = (currentEvent.ticket.price - currentEvent.ticket.discount * currentEvent.ticket.price) * sessionIds.length;
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
            typeof req.body.sessionId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId, sessionId } = req.body;

        try {
            var currentApplyEvent = await ApplyEvent.findOne({ userId: joinUserId, eventId: eventId });

            if (currentApplyEvent) {
                let session = currentApplyEvent.session.find(element => {
                    if (sessionId === element.id) {
                        if (element.isConfirm == true) {
                            next({ error: { message: 'Menber has verified!', code: 721 } });
                        }

                        if (element.isReject != true && currentApplyEvent.qrcode == joinUserId) {
                            element.isConfirm = true
                        } else {
                            element.isConfirm = false
                        }
                        return element
                    }
                })

                await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })

                if (session) {
                    if (session.isConfirm) {
                        return res.status(200).json({ result: true });
                    } else {
                        if (session.isReject) {
                            next({ error: { message: 'Join user have rejected', code: 705 } });
                        } else {
                            next({ error: { message: 'Join user have not payment for this event', code: 704 } });
                        }
                    }
                } else {
                    next({ error: { message: 'Not found session', code: 708 } });
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
            typeof req.body.joinUserId === 'undefined' ||
            typeof req.body.sessionId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId, sessionId } = req.body;
        let userId = "5ec8e500bc1ae931e85dfa3c";// req.user;

        try {
            var currentEvent = await Event.findById(eventId);
            var applyEvent = await ApplyEvent.findOne({ userId: joinUserId, eventId: eventId });
            let session = applyEvent.session.find(element => {
                if (sessionId === element.id) {
                    return element
                }
            })

            if (session) {
                if (session.isReject != true) {
                    session.isReject = true
                    session.status = "REJECT"

                    const newNotification = new Notification({
                        sender: userId,
                        receiver: [joinUserId],
                        type: "EVENT_REJECT",
                        message: "",
                        title: "{sender} rejected you form event " + currentEvent.name,
                        linkTo: {
                            key: "EventDetail",
                            _id: eventId,
                        },
                        session: [sessionId],
                        isRead: false,
                        isDelete: false,
                        createdAt: Date()
                    });

                    currentEvent.session.forEach(ele => {
                        if (ele.id === sessionId) {
                            ele.joinNumber = ele.joinNumber == 0 ? 0 : (ele.joinNumber - 1)
                        }
                    })

                    if (session.paymentId !== undefined && session.paymentId !== null && session.paymentId !== FreePaymentId) {
                        req.body.paymentId = session.paymentId

                        await payment_Controller.refund(req, res, next)
                    }
                    
                    await ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: applyEvent.session });
                    await Event.findByIdAndUpdate({ _id: currentEvent._id }, { session: currentEvent.session });
                    
                    newNotification.save();
                    
                    return res.status(200).json({ result: true });
                } else {
                    next({ error: { message: 'you have rejected', code: 710 } });
                }
            } else {
                next({ error: { message: 'Session not found', code: 723 } });
            }
        } catch (err) {
            next(err);
        }
    },

    cancelEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, sessionIds } = req.body;
        let userId = req.user;

        try {
            var event = await Event.findById(eventId);

            if (!event) {
                next({ error: { message: "Event not found!", code: 724 } });
                return;
            }

            var applyEvents = null;
            var cancelJoin = false;

            if (sessionIds) {
                event.session.forEach(ele => {
                    if (sessionIds.includes(ele.id)) {
                        if (userId == event.userId) {
                            ele.isCancel = true
                        } else {
                            cancelJoin = true;
                            ele.joinNumber = ele.joinNumber == 0 ? 0 : (ele.joinNumber - 1)
                        }
                    }
                })

                applyEvents = await ApplyEvent.find({ eventId: eventId, session: { $elemMatch: { id: { $in: sessionIds } } } });
            } else {
                event.session.forEach(ele => {
                    ele.isCancel = true
                })

                event.status = "CANCEL";
                applyEvents = await ApplyEvent.find({ eventId: eventId });
            }

            var joinUserIds = [];
            var sessionNoti = [];
            var typeNoti = "EVENT_CANCEL";
            var titleMess = "{sender} cancelled event " + event.name;
            var index = 0
            var isCancelled = false

            while (index < applyEvents.length) {
                let itemChanges = applyEvents[index].session.filter(element => {

                    if (sessionIds) {
                        if (sessionIds.includes(element.id)) {
                            if (element.isCancel == true && userId != event.userId) {
                                next({ error: { message: "Some session cancelled!", code: 722 } });
                                isCancelled = true;
                                return;
                            }

                            if (element.isCancel != true) {
                                element.isCancel = true
                                element.status = element.status != "REJECT" ? "CANCEL" : "REJECT"

                                return element
                            }
                        }
                    } else {
                        if (element.isCancel != true) {
                            element.isCancel = true
                            element.status = "CANCEL"

                            return element
                        }
                    }
                })

                var i = 0;

                while (i < itemChanges.length) {
                    if (sessionNoti.indexOf(itemChanges[i].id) === -1) {
                        sessionNoti.push(itemChanges[i].id);
                    }

                    if (itemChanges[i].paymentId !== FreePaymentId) {
                        req.body.paymentId = itemChanges[i].paymentId;
                        req.body.joinUserId = applyEvents[index].userId;
                        req.body.sessionId = itemChanges[i].id;


                        await payment_Controller.refund(req, res, next);
                    }

                    i++;
                }

                if (joinUserIds.indexOf(applyEvents[index].userId) === -1) {
                    joinUserIds.push(applyEvents[index].userId);
                }

                var subSessions = applyEvents[index].session

                if (cancelJoin) {
                    subSessions = applyEvents[index].session.filter(element => {
                        if (!sessionIds.includes(element.id)) {
                            return element
                        }
                    })
                }

                await ApplyEvent.findByIdAndUpdate({ _id: applyEvents[index]._id }, { session: subSessions });

                index++;
            }

            if (sessionIds) {
                typeNoti = "SESSION_CANCEL"
                titleMess = "{sender} cancelled some session in event " + event.name;
                
                if (userId == event.userId) {
                	titleMess = "{sender} canceled participation in event " + event.name;
                }
            }

            if (!isCancelled) {
                const newNotification = new Notification({
                    sender: userId,
                    receiver: userId == event.userId ? joinUserIds : [event.userId],
                    type: typeNoti,
                    message: "",
                    title: titleMess,
                    linkTo: {
                        key: "EventDetail",
                        _id: eventId,
                    },
                    isRead: false,
                    isDelete: false,
                    createdAt: Date(),
                    session: sessionNoti
                });

                newNotification.save();
                await Event.findByIdAndUpdate({ _id: event._id }, { session: event.session, status: event.status });
            }
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

    },


}