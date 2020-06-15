const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');
const Event = mongoose.model('event');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');

const ObjectId = mongoose.Types.ObjectId;
const adminId = "5ee5d9aff7a5a623d08718d5"

const payment_Controller = require('../controller/payment_Controller');

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
                        qrcode: userId
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
        let userId = req.user;

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
                    if (session.isConfirm == true) {
                        next({ error: { message: "Session starting, Can not reject user", code: 710 } });
                        return;
                    }

                    session.isReject = true,
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
                        isDelete: false
                    });

                    currentEvent.session.forEach(ele => {
                        if (ele.id === sessionId) {
                            ele.joinNumber = ele.joinNumber == 0 ? 0 : (ele.joinNumber - 1)
                        }
                    })

                    if (session.paymentId !== undefined && session.paymentId !== null) {
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
            let isUserEvent = userId == event.userId;

            if (sessionIds) {
                event.session.forEach(ele => {
                    if (sessionIds.includes(ele.id)) {
                        if (isUserEvent) {
                            ele.isCancel = true
                        } else {
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
                            if (element.isCancel == true && !isUserEvent) {
                                next({ error: { message: "Some session cancelled!", code: 722 } });
                                isCancelled = true;
                                return;
                            }

                            if (element.isCancel != true) {
                                if (isUserEvent) {
                                    element.isCancel = true
                                    element.status = element.status != "REJECT" ? "CANCEL" : "REJECT"
                                }

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

                if (joinUserIds.indexOf(applyEvents[index].userId) === -1) {
                    joinUserIds.push(applyEvents[index].userId);
                }

                const nextHandle = function (result, applyEvent) {
                    var subSessions = applyEvent.session

                    if (!isUserEvent) {
                        console.log("111111111111")

                        subSessions = subSessions.filter(ele => {
                            if (!sessionIds.includes(ele.id)) {
                                return ele;
                            } else if (result === false && applyEvent.id == ele.id) {
                                return ele;
                            }
                        })
                    }
    
                    Promise.all([
                        ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: subSessions })
                    ]) 
                }

                if (sessionIds && !isUserEvent) { 
                    let itemCancel = null

                    if (itemChanges && itemChanges.length > 0) {
                        itemCancel = itemChanges[0]
                    }

                    if (itemCancel) {
                        if (sessionNoti.indexOf(itemCancel.id) === -1) {
                            sessionNoti.push(itemCancel.id);
                        }
    
                        if (itemCancel.isReject != true && itemCancel.paymentId !== undefined && itemCancel.paymentId !== null) {
                            req.body.paymentId = itemCancel.paymentId;
                            req.body.joinUserId = applyEvents[index].userId;
                            req.body.sessionId = itemCancel.id;
    
                            Promise.all([
                                payment_Controller.refund(req, res, next)
                            ]).then(async ([result]) => {
                                Promise.all([
                                    nextHandle(result, applyEvents[index])
                                ])
                            })
                        } else {
                            Promise.all([
                                nextHandle(true, applyEvents[index])
                            ])
                        }
                    } else {
                        next({ error: { message: "Session not found!", code: 722 } });
                        return;
                    }
                } else {
                    var i = 0;

                    while (i < itemChanges.length) {
                        if (sessionNoti.indexOf(itemChanges[i].id) === -1) {
                            sessionNoti.push(itemChanges[i].id);
                        }

                        i++;
                    }

                    Promise.all([
                        nextHandle(null, applyEvents[index])
                    ])
                }

                index++;
            }

            if (sessionIds) {
                typeNoti = "SESSION_CANCEL"
                titleMess = "{sender} cancelled some session in event " + event.name;

                if (!isUserEvent) {
                    titleMess = "{sender} canceled participation in event " + event.name;
                }
            }

            if (!isCancelled) {
                const newNotification = new Notification({
                    sender: userId,
                    receiver: isUserEvent ? joinUserIds : [event.userId],
                    type: typeNoti,
                    message: "",
                    title: titleMess,
                    linkTo: {
                        key: "EventDetail",
                        _id: eventId,
                    },
                    isRead: false,
                    isDelete: false,
                    session: sessionNoti
                });

                if (event.isSellTicket == true && isUserEvent) {
                    const adminNotification = new Notification({
                        sender: userId,
                        receiver: [adminId],
                        type: typeNoti,
                        message: "",
                        title: titleMess,
                        linkTo: {
                            key: "EventDetail",
                            _id: eventId,
                        },
                        isRead: false,
                        isDelete: false,
                        session: sessionNoti
                    });

                    adminNotification.save();
                }

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