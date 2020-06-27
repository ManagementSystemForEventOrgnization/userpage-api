const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');
const Event = mongoose.model('event');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');
const keys = require('../config/key.js');
const ObjectId = mongoose.Types.ObjectId;
const payment_Controller = require('../controller/payment_Controller');

module.exports = {
    updatePaymentStatus: async (req, res, next) => {
        if (typeof req.body.paymentId === 'undefined' ||
            typeof req.body.transactionId === 'undefined' ||
            typeof req.body.status === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { paymentId, status, transactionId } = req.body;

        try {
            var currentPayment = await Payment.findById(paymentId);

            if (currentPayment) {
                currentPayment.zptransId = transactionId
                currentPayment.status = status == true ? "PAID" : "FAILED";
                await currentPayment.save();

                return res.status(200).json({ result: true })
            } else {
                next({ error: { message: 'Not found this payment', code: 703 } });
            }
        } catch (err) {
            next({ error: { message: "Server execute failed!", code: 776 } });
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
                if (currentEvent.status !== "PUBLIC") {
                    next({ error: { message: 'Waiting for public event', code: 730 } });
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
                        urlWeb: currentEvent.domain + currentEvent.urlWeb
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
            next({ error: { message: "Server execute failed!", code: 776 } });
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
            next({ error: { message: "Server execute failed!", code: 776 } });
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
            next({ error: { message: "Server execute failed!", code: 776 } });
        }
    },

    rejectEventMenber: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.joinUserId === 'undefined' || +
            typeof req.body.sessionId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId, sessionId } = req.body;
        let userId = req.user;

        Promise.all([
            Event.findById(eventId),
            ApplyEvent.findOne({ userId: joinUserId, eventId: eventId })
        ]).then(async ([currentEvent, applyEvent]) => {
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
                            urlWeb: currentEvent.domain + currentEvent.urlWeb
                        },
                        session: [sessionId],
                        isRead: false,
                        isDelete: false
                    });

                    const nextHandle = async function (response, isUserEvent, applyEvent, event, noti) {
                        if (response == true) {
                            Promise.all([
                                ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: applyEvent.session }),
                                Event.findByIdAndUpdate({ _id: event._id }, { session: event.session }),
                                noti.save()
                            ]).then(() => {
                                return res.status(200).json({ result: true });
                            }).catch((err) => {
                                return next({ error: { message: 'Save data failed', code: 775 } });
                            })
                        } else {
                            return next({ error: { message: 'Can not reject because refund failed', code: 774 } });
                        }
                    }

                    currentEvent.session.forEach(ele => {
                        if (ele.id === sessionId) {
                            ele.joinNumber = ele.joinNumber == 0 ? 0 : (ele.joinNumber - 1)
                        }
                    })

                    if (session.paymentId !== undefined && session.paymentId !== null) {
                        req.body.paymentId = session.paymentId
                        req.body.applyEvent = applyEvent
                        req.body.sendNoti = newNotification
                        req.body.eventChange = currentEvent
                        req.body.isUserEvent = false

                        Promise.all([
                            payment_Controller.refund(req, res, next, nextHandle)
                        ]).then().catch((err) => {
                            next({ error: { message: 'Save data failed', code: 775 } });
                        })
                    } else {
                        nextHandle(true, false, applyEvent, currentEvent, newNotification);
                    }
                } else {
                    next({ error: { message: 'you have rejected', code: 710 } });
                }
            } else {
                next({ error: { message: 'User not found', code: 723 } });
            }
        }).catch((err) => {
            next({ error: { message: "Object not found!", code: 777 } });
        })
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

                if (isUserEvent) {
                    applyEvents = await ApplyEvent.find({ eventId: eventId, session: { $elemMatch: { id: { $in: sessionIds } } } });
                } else {
                    applyEvents = await ApplyEvent.find({ eventId: eventId, userId: userId, session: { $elemMatch: { id: { $in: sessionIds } } } });
                }
                
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

            const nextHandle = async function (result, isUserEvent, applyEvent, event, noti) {
                console.log("result1")
                var subSessions = applyEvent.session

                console.log("result", result)
                if (!isUserEvent) {
                    subSessions = subSessions.filter(ele => {
                        if (!sessionIds.includes(ele.id)) {
                            return ele;
                        } else if (result === false && applyEvent.id == ele.id) {
                            return ele;
                        }
                    })

                    Promise.all([
                        Event.findByIdAndUpdate({ _id: event._id }, { session: event.session, status: event.status })
                    ])
                }

                Promise.all([
                    ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: subSessions })
                ]).then(() => {
                    if (!isUserEvent) {
                        return res.status(200).json({ result: result });
                    }
                })
            }

            while (index < applyEvents.length) {
                let itemChanges = applyEvents[index].session.filter(element => {
                    if (sessionIds) {
                        if (sessionIds.includes(element.id)) {
                            if ((element.isCancel == true || element.isReject == true) && !isUserEvent) {
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
                            req.body.applyEvent = applyEvents[index];
                            req.body.eventChange = event
                            req.body.isUserEvent = isUserEvent
                            req.body.sendNoti = null;
                            
                            Promise.all([
                                payment_Controller.refund(req, res, next, nextHandle)
                            ])
                        } else {
                            nextHandle(true, isUserEvent, applyEvents[index], event, null)
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

                    nextHandle(null, isUserEvent, applyEvents[index])
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
                if (event.isSellTicket == true && isUserEvent) {
                    const adminNotification = new Notification({
                        sender: userId,
                        receiver: [keys.adminId],
                        type: typeNoti,
                        message: "",
                        title: titleMess,
                        linkTo: {
                            key: "EventDetail",
                            _id: eventId,
                            urlWeb: event.domain + event.urlWeb
                        },
                        isRead: false,
                        isDelete: false,
                        session: sessionNoti
                    });

                    adminNotification.save();

                    titleMess = titleMess + " and waiting for us refund your money."
                }

                const newNotification = new Notification({
                    sender: userId,
                    receiver: isUserEvent ? joinUserIds : [event.userId],
                    type: typeNoti,
                    message: "",
                    title: titleMess,
                    linkTo: {
                        key: "EventDetail",
                        _id: eventId,
                        urlWeb: event.domain + event.urlWeb
                    },
                    isRead: false,
                    isDelete: false,
                    session: sessionNoti
                });

                newNotification.save();

                if (isUserEvent) {
                    await Event.findByIdAndUpdate({ _id: event._id }, { session: event.session, status: event.status });
                }
            }

            if (isUserEvent) {
                return res.status(200).json({ result: true });
            }
        } catch (err) {
            next({ error: { message: "Server execute failed!", code: 776 } });
        }
    },

    refundForCancelledUser: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.sessionId === 'undefined' ||
            typeof req.body.joinUserId === 'undefined' ||
            typeof req.body.paymentId === 'undefined' ||
            typeof req.body.adminId === 'undefined' 
        ) {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { paymentId, joinUserId, eventId, adminId } = req.body;

        if (adminId !== keys.adminId) {
            return next({ error: { message: "not an administrator!", code: 788 } });
        }
        
        try {
            let currentApplyEvent = await ApplyEvent.findOne({ userId: ObjectId(joinUserId), eventId: ObjectId(eventId) });

            if (currentApplyEvent) {
                req.body.eventId = ObjectId(eventId)
                req.body.joinUserId = ObjectId(joinUserId)
                req.body.paymentId = ObjectId(paymentId)
                req.body.applyEvent = currentApplyEvent;
                req.body.sendNoti = null;

                const nextHandle = async function (result, isUserEvent, applyEvent, event, noti) {
                    if (result === false) {
                        return res.status(200).json({ result: false });
                    } else {
                        console.log(applyEvent)
                        Promise.all([
                            ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: applyEvent.session }),
                            Event.findByIdAndUpdate({ _id: event._id }, { session: event.session })
                        ]).then ( async() => {
                            return res.status(200).json({ result: true });
                        })
                    }
                }
    
                Promise.all([
                    payment_Controller.refund(req, res, next, nextHandle)
                ]).then().catch((err) => {
                    return next({ error: { message: "Server execute failed!", code: 776 } });
                })
            } else {
                return next({ error: { message: "User have not joined this event!", code: 733 } });
            }
        } catch (err) {
            return next({ error: { message: "Object not found", code: 777 } });
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