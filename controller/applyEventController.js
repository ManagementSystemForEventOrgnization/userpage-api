const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');
const Event = mongoose.model('event');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');

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
            typeof req.body.joinTimes === 'undefined') 
        {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, joinTimes, payType } = req.body;
        let userId = req.user;

        try {
            let currentEvent = await Event.findById(eventId);

            if (currentEvent) {
                if (currentEvent.userId == userId) {
                    next({ error: { message: 'Can not join in yourself event', code: 706 } });
                    return;
                }

                var sessions = []

                currentEvent.session.forEach(element => {
                    if (joinTimes.includes(element.day)) {
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

                let currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId});

                if (sessions.length == 0 || sessions.length != joinTimes.length) {
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
                        if (joinTimes.includes(element.day)) {
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
            typeof req.body.joinTimes === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId, joinTimes, payType } = req.body;
        let userId = req.user;

        try {
            var currentEvent = await Event.findById(eventId);
            var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });
            var count = 0

            currentApplyEvent.session.forEach(element => {
                if (joinTimes.includes(element.day)) {
                    count += 1;
                }
            })

            if (count != joinTimes.length) {
                next({ error: { message: 'Choose session pay failed, please!', code: 720 } })
            }

            if (currentEvent && currentApplyEvent) {
                req.body.amount = (currentEvent.ticket.price - currentEvent.ticket.discount * currentEvent.ticket.price) * joinTimes.length;
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
            var currentApplyEvent = await ApplyEvent.findOne({ userId: joinUserId, eventId: eventId });

            if (currentApplyEvent) {
                let session = currentApplyEvent.session.find(element => {
                    if (joinTime == element.day) {
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
            typeof req.body.joinTime === 'undefined') 
        {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventId, joinTime } = req.body;
        let userId = req.user;

        try {
            var currentEvent = await Event.findById(eventId);
            var applyEvent = await ApplyEvent.findOne({ userId: joinUserId, eventId: eventId });
            let session = applyEvent.session.find(element => {
                if (joinTime === element.day) {
                    return element
                }
            })

            if (session) {
                if (session.isReject != true ) {
                    session.isReject = true
                    session.status = "REJECT"
                    
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
                        session: [joinTime],
                        isRead: false,
                        isDelete: false,
                        createdAt: Date()
                    });

                    currentEvent.session.forEach(ele => {
                        if (ele.day == joinTime) {
                            ele.joinNumber = ele.joinNumber == 0 ? 0 : (ele.joinNumber - 1)
                        }
                    })
        
                    if (session.paymentId !== undefined && session.paymentId !== null && session.paymentId !== FreePaymentId) {
                        req.body.paymentId = session.paymentId
                        
                        await payment_Controller.refund(req, res, next);
                    }
                    // Promise.all([
                        await newNotification.save();
                        await ApplyEvent.findByIdAndUpdate({ _id: applyEvent._id }, { session: applyEvent.session });
                        await Event.findByIdAndUpdate({ _id: currentEvent._id }, { session: currentEvent.session });
                        // rejectEventMenberNoti(req, res, next)
                    // ]).then(([apply, current, event]) => {
                        return res.status(200).json({ result: true });
                    // }).catch(([err1, err2, err3]) => {
                    //     next({ error: { message: 'Save error from server!', code: 800 } });
                    // })

                } else {
                    next({ error: { message: 'you have rejected', code: 710 } });
                }
            } else {
                next({ error: { message: 'Not found session', code: 708 } });
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

        let { eventId, sessionTime } = req.body;
        let userId = "5ec8e500bc1ae931e85dfa3c" //req.user;

        try {
            var event = await Event.findById(eventId);

            if (!event) {
                next({ error: { message: "Event not found!", code: 724 } });
            }

            var applyEvents = null;

            if (sessionTime) {
                event.session.forEach(ele => {
                    if (sessionTime == ele.day) {
                        ele.isCancel = true
                    }
                })

                applyEvents = await ApplyEvent.find({ eventId: eventId, session: {$elemMatch: {day: sessionTime}} });
            } else {
                event.session.forEach(ele => {
                    ele.isCancel = true
                })

                event.status = "CANCEL";
                applyEvents = await ApplyEvent.find({ eventId: eventId });
            }

            var joinUserIds = [];
            var sessionNoti = [];
            var index = 0
            
            while (index < applyEvents.length) {
                let itemChanges = applyEvents[index].session.filter(element => {
                    if (sessionTime) {
                        if (sessionTime == element.day) {
                            element.isCancel = true
                            element.status = "CANCEL"

                            return element
                        }
                    } else {
                        element.isCancel = true
                        element.status = "CANCEL"

                        return element
                    }
                })

                var i = 0;
                while (i < itemChanges.length) {
                    if (sessionNoti.indexOf(itemChanges[i].day) === -1) {
                        sessionNoti.push(itemChanges[i].day);
                    }
                    
                    console.log(itemChanges[i])
                    if (itemChanges[i].paymentId !== FreePaymentId) {
                        req.body.paymentId = itemChanges[i].paymentId;
                        req.body.joinUserId = applyEvents[index].userId;
                        req.body.joinTime = itemChanges[i].day;
                        console.log(req.body)
                        await payment_Controller.refund(req, res, next);
                    }

                    i++;
                }

                if (joinUserIds.indexOf(applyEvents[index].userId) === -1) {
                    joinUserIds.push(applyEvents[index].userId);
                }
                
                await ApplyEvent.findByIdAndUpdate({ _id: applyEvents[index]._id }, { session: applyEvents[index].session });
                        
                index++;
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
                createdAt: Date(),
                session: sessionNoti
            });

            await newNotification.save();
            await Event.findByIdAndUpdate({ _id: event._id }, { session: event.session });
                 
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