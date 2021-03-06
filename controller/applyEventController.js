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
            typeof req.body.eventId === 'undefined' ||
            typeof req.body.sessionIds === 'undefined' ||
            typeof req.body.transactionId === 'undefined' ||
            typeof req.body.status === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, sessionIds, paymentId, status, transactionId } = req.body;
        let userId = req.user;
        
        Promise.all([
            Event.findById(eventId),
            ApplyEvent.findOne({ userId: userId, eventId: eventId }),
            Payment.findById(paymentId)
        ]).then(([currentEvent, applyEvent, currentPayment]) => {
            if (currentPayment) {
                currentPayment.zptransId = transactionId
                currentPayment.status = status == true ? "PAID" : "FAILED";
                
                if (status == true) {
                    var isExit = false

                    currentEvent.session.forEach(element => {
                        if (sessionIds.includes(element.id)) {
                            if (element.isCancel == true) {
                                isExit = true
                                return next({ error: { message: 'Some session cancelled, can you reload and choose again', code: 718 } });
                            }
    
                            var joinNumber = element.joinNumber || 0;
                            joinNumber += 1;
    
                            if (joinNumber <= element.limitNumber) {
                                element.joinNumber = joinNumber;
                            } else {
                                isExit = true
                                return next({ error: { message: 'Exceeded the amount possible', code: 700 } });
                            }
                        }
                    })

                    if (isExit === true) {
                        return
                    }

                    applyEvent.session.forEach(ele => {
                        if (sessionIds.includes(ele.id)) {
                            ele.paymentStatus = currentPayment.status
                        }
                    })
                }

                let eventCondition = { _id: currentEvent._id }
                let eventUpdate = { $inc: { "session.$[element].joinNumber" : 1 } }
                let eventFilter = { arrayFilters: [ { "element.id": { $in: sessionIds } } ] }

                Promise.all([
                    currentPayment.save(),
                    ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: applyEvent.session }),
                    Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter)
                ]).then (() => {
                    return res.status(200).json({ result: true })
                }).catch ((err) => {
                    return next({ error: { message: "Something went wrong", code: 776 } });
                })
            } else {
                next({ error: { message: 'Not found this payment', code: 703 } });
            }
        }).catch((err) => {
            next({ error: { message: "Something went wrong", code: 776 } });
        })
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
            var isExit = false
            
            if (currentEvent) {
                if (JSON.stringify(currentEvent.userId) === JSON.stringify(userId)) {
                    return next({ error: { message: 'Can not join in yourself event', code: 706 } });
                }
                if (currentEvent.status === "CANCEL" || currentEvent.status === "DELETE") {
                    return next({ error: { message: 'Event cancelled', code: 719 } });
                }
                if (currentEvent.status !== "PUBLIC") {
                    return next({ error: { message: 'Waiting for public event', code: 730 } });
                }

                var sessions = []

                currentEvent.session.forEach(element => {
                    if (sessionIds.includes(element.id)) {
                        if (element.isCancel == true) {
                            isExit = true
                            return next({ error: { message: 'Some session cancelled, can you reload and choose again', code: 718 } });
                        }

                        let currentDate = new Date()
                        if (element.day < currentDate) {
                            isExit = true
                            return next({ error: { message: 'Some session started, can you reload and choose again', code: 719 } });
                        }

                        var joinNumber = element.joinNumber || 0;
                        joinNumber += 1;

                        if (joinNumber <= element.limitNumber) {
                            element.joinNumber = joinNumber;

                            sessions.push(element);
                        } else {
                            isExit = true
                            return next({ error: { message: 'Exceeded the amount possible', code: 700 } });
                        }
                    }
                })

                if (isExit === true) {
                    return
                }

                let currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

                if (sessions.length == 0 || sessions.length != sessionIds.length) {
                    return next({ error: { message: 'Not found session!', code: 725 } });
                }

                var updateSession = function (isSet) {
                    sessions.forEach(element => {
                        element.status = isSet ? "JOINED" : undefined
                        element.isConfirm = isSet ? false : undefined
                        element.isReject = isSet ? false : undefined
                        element.qrcode = isSet ? eventId + element.id : undefined
                    })
                }
                
                if (currentApplyEvent) {
                    currentApplyEvent.session.forEach(element => {
                        if (sessionIds.includes(element.id)) {
                            isExit = true
                            return next({ error: { message: 'You have already joined in one of these session', code: 701 } });
                        }
                    })

                    if (isExit === true) {
                        return
                    }

                    updateSession(true)
                    let changeSession = currentApplyEvent.session.concat(sessions)

                    await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: changeSession })
                } else {
                    updateSession(true)

                    let newApplyEvent = new ApplyEvent({
                        userId: userId,
                        eventId: eventId,
                        session: sessions
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
                        urlWeb: currentEvent.urlWeb
                    },
                    isRead: false,
                    isDelete: false,
                    session: sessionIds
                });

                newNotification.save();
                updateSession(false)

                if (currentEvent.isSellTicket == true) {
                    req.body.amount = (currentEvent.ticket.price - (currentEvent.ticket.discount  / 100 * currentEvent.ticket.price)) * sessions.length;
                    req.body.receiver = currentEvent.userId;
                    req.body.event = currentEvent;

                    if (payType === "CREDIT_CARD") {
                        await payment_Controller.create_charges(req, res, next);
                    } else {
                        await payment_Controller.create_order(req, res, next);
                    }
                } else {
                    console.log("joind event")
                    let eventCondition = { _id: currentEvent._id }
                    let eventUpdate = { $inc: { "session.$[element].joinNumber" : 1 } }
                    let eventFilter = { arrayFilters: [ { "element.id": { $in: sessionIds } } ] }

                    await Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter)

                    console.log("joind event1")
                    return res.status(200).json({ result: true })
                }
            } else {
                next({ error: { message: 'Event not exists', code: 403 } });
            }
        }
        catch (err) {
            next({ error: { message: "Something went wrong", code: 776 } });
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
            var isExit = false

            currentApplyEvent.session.forEach(element => {
                if (sessionIds.includes(element.id)) {
                    count += 1;


                    let currentDate = new Date()
                    if (element.day < currentDate) {
                        isExit = true
                        return next({ error: { message: 'Some session started, can you reload and choose again', code: 719 } });
                    }

                    if (element.isReject == true) {
                        count = 0;
                        isExit = true
                        return next({ error: { message: 'You have rejected', code: 705 } });
                    } else if (element.isCancel == true) {
                        count = 0;
                        isExit = true
                        return next({ error: { message: 'Session have cancelled', code: 726 } })
                    }
                }
            })

            currentEvent.session.forEach(ele => {
                if (ele.isCancel != true && sessionIds.includes(ele.id)) {
                    var joinNumber = ele.joinNumber || 0;
                    joinNumber += 1;

                    if (joinNumber <= ele.limitNumber) {
                        ele.joinNumber = joinNumber;
                    } else {
                        isExit = true
                        next({ error: { message: 'Exceeded the amount possible', code: 700 } });
                        return;
                    }
                }
            })

            if (isExit === true) {
                return
            }
            
            if (count > 0) {
                if (count != sessionIds.length) {
                    next({ error: { message: 'Choose session pay failed, please!', code: 720 } })
                }

                if (currentEvent && currentApplyEvent) {
                    req.body.amount = (currentEvent.ticket.price - (currentEvent.ticket.discount / 100 * currentEvent.ticket.price)) * sessionIds.length;
                    req.body.receiver = currentEvent.userId;
                    req.body.event = currentEvent;

                    if (payType === "CREDIT_CARD") {
                        await payment_Controller.create_charges(req, res, next);
                    } else {
                        await payment_Controller.create_order(req, res, next);
                    }
                } else {
                    next({ error: { message: 'Session  not found!', code: 707 } });
                }
            } else {
                next({ error: { message: 'Session  not found!', code: 707 } });
            }
        }
        catch (err) {
            next({ error: { message: "Something went wrong", code: 776 } });
        }
    },

    verifyEventMember: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined' ||
            typeof req.body.qrcode === 'undefined' ||
            typeof req.body.sessionId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { qrcode, eventId, sessionId } = req.body;
        let userId = req.user;

        if (eventId + sessionId != qrcode) {
            next({ error: { message: 'This session does not match, please check it!', code: 794 } });
        }

        try {
            var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

            if (currentApplyEvent) {
                let session = currentApplyEvent.session.find(element => {
                    if (sessionId === element.id) {
                        if (element.isConfirm == true) {
                            next({ error: { message: 'Menber has verified!', code: 721 } });
                        }

                        if (element.isCancel != true && element.isReject != true && element.qrcode === qrcode) {
                            if (element.paymentStatus != undefined && element.paymentStatus != "PAID") {
                                element.isConfirm = false
                            } else {
                                element.isConfirm = true
                            }
                            
                        } else {
                            element.isConfirm = false
                        }
                        return element
                    }
                })

                if (session) {
                    if (session.isConfirm) {
                        await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })
                        return res.status(200).json({ result: true });
                    } else {
                        if (session.isCancel) {
                            next({ error: { message: 'This session have cancelled', code: 754 } });
                        } else if (session.isReject) {
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
            next({ error: { message: "Something went wrong", code: 776 } });
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
                let currentDate = new Date()

                if (session.day < currentDate) {
                    return next({ error: { message: 'Session started, Can not reject user', code: 719 } });
                }

                if (session.isCancel === true) {
                    next({ error: { message: "Session cancelled, Can not reject user", code: 710 } });
                    return;
                }
                
                if (session.isReject != true) {
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
                            urlWeb: currentEvent.urlWeb
                        },
                        session: [sessionId],
                        isRead: false,
                        isDelete: false
                    });

                    const nextHandle = async function (response, isUserEvent, applyEvent, event, noti, sessionId) {
                        console.log(event)
                        console.log(applyEvent)
                        console.log(sessionId)
                        console.log(applyEvent.session)
                        console.log(event.session)
                        if (response == true) {
                            if (sessionId) {
                                let applySession = applyEvent.session.find(element => {
                                    if (sessionId === element.id) {
                                        return element
                                    }
                                })
                                let eventSession = event.session.find(element => {
                                    if (sessionId === element.id) {
                                        return element
                                    }
                                })
                                
                                let applyCondition = { _id: applyEvent._id }
                                let applyUpdate = { $set: { "session.$[element]" : applySession } }
                                let applyFilter = { arrayFilters: [ { "element.id": sessionId } ] }

                                let eventCondition = { _id: event._id }
                                let eventUpdate = { $set: { "session.$[element]" : eventSession } }
                                let eventFilter = { arrayFilters: [ { "element.id": sessionId } ] }

                                Promise.all([
                                    ApplyEvent.findOneAndUpdate(applyCondition, applyUpdate, applyFilter),
                                    Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter),
                                    noti.save()
                                ]).then(() => {
                                    return res.status(200).json({ result: true });
                                }).catch((err) => {
                                    return next({ error: { message: 'Save data failed', code: 775 } });
                                })
                            } else {
                                return next({ error: { message: 'Something went wrong', code: 776 } });
                            }
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
                        req.body.isUserEvent = true
                        req.body.isRejectUser = true

                        Promise.all([
                            payment_Controller.refund(req, res, next, nextHandle)
                        ]).then().catch((err) => {
                            next({ error: { message: 'Save data failed', code: 775 } });
                        })
                    } else {
                        nextHandle(true, false, applyEvent, currentEvent, newNotification, sessionId);
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
            let isUserEvent = JSON.stringify(userId) === JSON.stringify(event.userId);
            var isExit = false
            
            if (sessionIds) {
                event.session.forEach(ele => {
                    if (sessionIds.includes(ele.id)) {
                        if (isUserEvent) {
                            ele.isCancel = true
                        } else {
                            let currentDate = new Date()
                            if (ele.day < currentDate) {
                                isExit = true
                                return next({ error: { message: 'Some session started, can you reload and choose again', code: 719 } });
                            }
                            
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

            if (isExit === true) {
                return
            }
            
            if (applyEvents.length == 0 ) {
                if (isUserEvent) {
                    await Event.findByIdAndUpdate({ _id: event._id }, { session: event.session, status: event.status })
                    return res.status(200).json({ result: true });
                } else {
                    return next({ error: { message: "Session not found!", code: 700 } });
                }
            }

            var joinUserIds = [];
            var sessionNoti = [];
            var typeNoti = "EVENT_CANCEL";
            var titleMess = "{sender} cancelled event " + event.name;
            var index = 0
            var isCancelled = false

            const nextHandle = async function (result, isUserEvent, applyEvent, event, noti, sessionId) {
                var subSessions = applyEvent.session

                if (!isUserEvent) {
                    subSessions = subSessions.filter(ele => {
                        if (!sessionIds.includes(ele.id)) {
                            return ele;
                        } else if (result === false && applyEvent.id == ele.id) {
                            return ele;
                        }
                    })
                    
                    let eventCondition = { _id: event._id }
                    let eventUpdate = { $inc: { "session.$[element].joinNumber" : -1 } }
                    let eventFilter = { arrayFilters: [ { "element.id": { $in: sessionIds } } ] }

                    Promise.all([
                        Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter)
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

                if (isCancelled === true) {
                    return
                }

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
                        if (itemCancel.isConfirm == true) {
                            next({ error: { message: "Can not cancel!", code: 791 } });
                            return;
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
                            nextHandle(true, isUserEvent, applyEvents[index], event, null, null)
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

                    nextHandle(null, isUserEvent, applyEvents[index], null, null, null)
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
                            urlWeb: event.urlWeb
                        },
                        isRead: false,
                        isDelete: false,
                        session: sessionNoti
                    });

                    adminNotification.save();

                    titleMess = titleMess + " and waiting for us refund your money."
                }

                if (isUserEvent) {
                    joinUserIds.forEach(joinId => {
                        const newNotification = new Notification({
                            sender: userId,
                            receiver: [joinId],
                            type: typeNoti,
                            message: "",
                            title: titleMess,
                            linkTo: {
                                key: "EventDetail",
                                _id: eventId,
                                urlWeb: event.urlWeb
                            },
                            isRead: false,
                            isDelete: false,
                            session: sessionNoti
                        });
        
                        newNotification.save();    
                    })
                } else {
                    const newNotification = new Notification({
                        sender: userId,
                        receiver: [event.userId],
                        type: typeNoti,
                        message: "",
                        title: titleMess,
                        linkTo: {
                            key: "EventDetail",
                            _id: eventId,
                            urlWeb: event.urlWeb
                        },
                        isRead: false,
                        isDelete: false,
                        session: sessionNoti
                    });

                    newNotification.save();    
                }
                
                if (isUserEvent) {
                    await Event.findByIdAndUpdate({ _id: event._id }, { session: event.session, status: event.status });
                }
            }

            if (isUserEvent) {
                return res.status(200).json({ result: true });
            }
        } catch (err) {
            next({ error: { message: "Something went wrong", code: 776 } });
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
                req.body.isUserEvent = true;
                req.body.isReject = true;

                const nextHandle = async function (result, isUserEvent, applyEvent, event, noti, sessionId) {
                    console.log("applyEvent", applyEvent.session)
                    if (result === false) {
                        return res.status(200).json({ result: false });
                    } else {
                        if (sessionId) {
                            let applySession = applyEvent.session.find(element => {
                                if (sessionId === element.id) {
                                    return element
                                }
                            })
                            let eventSession = event.session.find(element => {
                                if (sessionId === element.id) {
                                    return element
                                }
                            })
                            
                            let applyCondition = { _id: applyEvent._id }
                            let applyUpdate = { $set: { "session.$[element]" : applySession } }
                            let applyFilter = { arrayFilters: [ { "element.id": sessionId } ] }

                            let eventCondition = { _id: event._id }
                            let eventUpdate = { $set: { "session.$[element]" : eventSession } }
                            let eventFilter = { arrayFilters: [ { "element.id": sessionId } ] }

                            Promise.all([
                                ApplyEvent.findOneAndUpdate(applyCondition, applyUpdate, applyFilter),
                                Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter)
                            ]).then(async () => {
                                console.log("save success")
                                return res.status(200).json({ result: true });
                            })
                        } else {
                            return next({ error: { message: "Something went wrong", code: 776 } });
                        }
                    }
                }

                Promise.all([
                    payment_Controller.refund(req, res, next, nextHandle)
                ]).then().catch((err) => {
                    return next({ error: { message: "Something went wrong", code: 776 } });
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