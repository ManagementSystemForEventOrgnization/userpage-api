const crypto = require('crypto');
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const myFunction = require('../utils/function');
const Event = mongoose.model('event');
const PageEvent = mongoose.model('pageEvent');
const Comment = mongoose.model('comment');
const ApplyEvent = mongoose.model('applyEvent');
const Notification = mongoose.model('notification');
const Payment = mongoose.model('payment');
const Axios = require('axios');
const keys = require('../config/key.js');

module.exports = {

    publicPrivateEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId } = req.body;
        let userId = req.user;

        try {
            let event = await Event.findOne({ _id: ObjectId(eventId), userId: ObjectId(userId) });

            if (!event) {
                return next({ error: { message: 'Event not exists!', code: 777 } });
            }

            let typeOfEvent = event.typeOfEvent === "Public" ? "Private" : "Public"
            event.typeOfEvent = typeOfEvent

            await event.save();

            res.status(200).json({ result: event });
        } catch (error) {
            next({ error: { message: 'Err', code: 601 } });
        }
    },

    publishEvent: async (req, res, next) => {
        if (typeof req.body.eventId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventId } = req.body;
        let userId = req.user;

        try {
            let event = await Event.findOne({ _id: ObjectId(eventId), userId: ObjectId(userId) });

            if (!event) {
                return next({ error: { message: 'Event not exists!', code: 777 } });
            }

            if (event.status === "DRAFT") {
                event.status = "WAITING"

                Promise.all([
                    event.save()
                ]).then(() => {
                    res.status(200).json({ result: event });
                }).catch((err) => {
                    return next({ error: { message: "Something went wrong", code: 776 } });
                })

            } else if (event.status === "PUBLIC") {
                return next({ error: { message: 'This event did public', code: 755 } });
            } else if (event.status === "CANCEL") {
                return next({ error: { message: 'This event cancelled', code: 754 } });
            } else {
                return next({ error: { message: 'This event is waiting for review', code: 753 } });
            }
        } catch (error) {
            next({ error: { message: 'Error', code: 601 } });
        }
    },

    updateEvent: async (req, res, next) => {

        let objectUpdate = { ...req.body };
        let id = req.body.eventId;
        delete objectUpdate["eventId"];
        try {
            let e = await Event.findOneAndUpdate({ _id: ObjectId(id), userId: ObjectId(req.user) }, objectUpdate);

            if (!e) {
                return next({ error: { message: 'Event not exists!' } });
            }
            res.status(200).json({ result: e });
        } catch (error) {
            next({ error: { message: 'Err', code: 601 } });
        }

    },

    deleteEvent: async (req, res, next) => {
        let { eventId: id } = req.body;
        try {

            let checkApply = await ApplyEvent.findOne({
                eventId: ObjectId(id), $or: [{
                    'session':
                    {
                        $elemMatch: {
                            paymentId: { $exists: true }, paymentStatus: 'PAID', isRefund: false
                        }
                    }
                },
                { session: { $elemMatch: { payment: { $exists: false }, isReject: false, isCancel: { $exists: false } } } }
                ]
            });

            if (checkApply) {
                return next({ error: { message: 'Event has user apply. Can\'t delete', code: 700 } });
            }

            let e = await Event.findOneAndUpdate({ _id: ObjectId(id), userId: ObjectId(req.user) }, { status: 'DELETE' });
            if (!e) {
                return next({ error: { message: 'Event not exists', code: 601 } });
            }
            res.status(200).json({ result: e });
        } catch (error) {

        }
    },

    saveEvent: async (req, res, next) => {
        let { name, typeOfEvent, domain, category, urlWeb, session, isSellTicket, bannerUrl, ticket } = req.body;
        if (!name || !session) {
            return next({ error: { message: 'Invalid value', code: 602 } });
        }
        let userId = req.user;
        if (myFunction.validateUrlWeb(urlWeb)) {
            return next({ error: { message: 'Formation URL is wrong.', code: 422 } });
        }

        let checkURL = await Event.find({ urlWeb });
        if (checkURL.length !== 0) {
            next({ error: { message: 'URL is used', code: 402 } });
            return;
        }

        let e = new Event({
            userId,
            typeOfEvent,
            name,
            category,
            domain,
            urlWeb,
            session,
            isSellTicket,
            ticket,
            bannerUrl
        });

        try {
            let event = await e.save();
            if (!event) {
                return next({ error: { message: 'Invalid data, can\'t save data', code: 505 } });
            }
            res.status(200).json({ result: event });
        } catch (error) {
            next({ error: { message: error, code: 500 } })
        }
    },

    savePageEvent: async (req, res, next) => {
        let { blocks, eventId, isPreview, header } = req.body;
        isPreview = isPreview || false;
        try {
            eventId = eventId || '';
            let idUser = req.user;
            let checkEventUrl = await Event.findOne({ urlWeb: eventId });
            if (!checkEventUrl) {
                return next({ error: { message: 'Url is not exists!', code: 404 } });
            }
            eventId = await checkEventUrl._id;

            Promise.all([
                Event.findOne({ _id: ObjectId(eventId), userId: ObjectId(idUser) }),
                PageEvent.find({ eventId })
            ]).then(async ([e, pageEvent]) => {

                if (!e) {
                    return next({ error: { message: 'Event not exists', code: 300 } });
                }
                let _idE = e._id;
                if (pageEvent[0]) {
                    // xác nhận là đã lưu trước đó. chỉ cần update lại.

                    let _id = pageEvent[0]._id;
                    //let p = await PageEvent.findByIdAndUpdate({ _id: ObjectId(_id) }, { rows: blocks, updateAt: new Date(), header });
                    let objectUpdate = { isPreview };
                    if ((e.status || '') == 'PUBLIC') {
                        objectUpdate.status = 'EDITED';

                        const newNotification = new Notification({
                            sender: checkEventUrl.userId,
                            receiver: [keys.adminId],
                            type: "PUBLISH_EVENT",
                            message: "",
                            title: "{sender} has required review for the event " + checkEventUrl.name,
                            linkTo: {
                                key: "EventDetail",
                                _id: eventId,
                                urlWeb: checkEventUrl.urlWeb
                            },
                            isRead: false,
                            isDelete: false,
                            session: []
                        });

                        newNotification.save().then(e => {
                            Axios.post(`https://event-admin-page.herokuapp.com/api/push_notification`,
                                { content: `${checkEventUrl.name} has required review for the event ${checkEventUrl.name}` });
                        })
                    } else if (!isPreview) {
                        objectUpdate.status = 'WAITING';
                    }
                    Promise.all([
                        Event.findByIdAndUpdate({ _id: ObjectId(_idE) }, objectUpdate),
                        PageEvent.findByIdAndUpdate({ _id: ObjectId(_id) }, { rows: blocks, header })
                    ]).then(([e, pe]) => {
                        if (!pe) {
                            return next({ error: { message: 'Event is not exists', code: 422 } });
                        }
                    })
                } else {
                    let page = new PageEvent(
                        {
                            eventId: eventId,
                            rows: blocks,
                            header: header
                        }
                    );
                    let updateObject = { isPreview: isPreview };

                    if (!isPreview) {
                        updateObject.status = 'WAITING';
                    }
                    Promise.all([
                        Event.findByIdAndUpdate({ _id: ObjectId(_idE) }, updateObject),
                        page.save()
                    ]).then(([e, pe]) => {
                        if (!pe) {
                            return next({ error: { message: 'Invalid data, can\'t save data', code: 422 } });
                        }
                    })
                }
                res.status(200).json({ result: 'success' })
            }).catch((err) => {
                return next({ error: { message: 'Something is wrong', code: 300 } });
            })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    getPageEvent: async (req, res, next) => {
        let { eventId, index, editSite } = req.query; // eventId, index: 0,1,2,3,4
        //trả lên header, rows[index];
        index = index || 0;

        try {
            if (!eventId) {
                return next({ error: { message: 'Event is not exists', code: 422 } });
            }

            let checkEventUrl = await Event.findOne({ urlWeb: eventId });
            if (!checkEventUrl) {
                return next({ error: { message: 'Url is not exists!', code: 404 } });
            }
            eventId = await checkEventUrl._id;
            let idUser = req.user;
            Promise.all([
                ApplyEvent.findOne({ eventId: ObjectId(eventId), session: { $elemMatch: { isRefund: false } } }),
                ApplyEvent.findOne({ eventId: ObjectId(eventId), userId: ObjectId(idUser) }).populate('session.paymentId'),
                Event.findOne({ _id: ObjectId(eventId) }),
                PageEvent.findOne({ eventId: new ObjectId(eventId) },
                    { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }),
            ]).then(([checkApply, ap, e, p]) => {
                if (!e) {
                    return next({ error: { message: 'Event is not exists', code: 422 } });
                }
                let result = {};

                if (editSite && (JSON.stringify(idUser) != JSON.stringify(e.userId))) {
                    next({ error: { message: 'You are not authorization' } });
                    return;
                }

                if (editSite && checkApply) {

                    if ((+(e.isEdit || 0) - (Date.now())) < 0) {
                        next({ error: { message: 'Event has user apply! Please contact with admin to resolve!', code: 700 } });
                        return;
                    }
                }

                if (ap) {
                    let eS = e.session;
                    let apS = ap.session;
                    for (let i = 0; i < apS.length; i++) {
                        let e = apS[i];
                        for (let j = 0; j < eS.length; j++) {
                            let element = eS[j];
                            if (element.id == e.id) {
                                eS[j].status = e.status;
                                eS[j].isConfirm = e.isConfirm;
                                eS[j].isReject = e.isReject;
                                eS[j].paymentId = e.paymentId;
                                eS[j].isCancel = e.isCancel;
                                break;
                            }
                        }
                    }
                    e.session = eS;

                }
                result.event = e;
                result.header = p.header;
                result.eventId = p.eventId;
                result.rows = editSite ? (p.rows) : (p.rows[index]);
                if (!p) {
                    return next({ error: { message: 'Event is not exists!', code: 500 } });
                }

                res.status(200).json({ result: result });
            }).catch(err => {
                return next({ error: { message: 'Event is not exists!', code: 600 } });
            })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },
    getPageEventEdit: async (req, res, next) => {
        let { eventId, index, editSite } = req.query; // eventId, index: 0,1,2,3,4
        //trả lên header, rows[index];
        index = index || 0;

        try {
            if (!eventId) {
                return next({ error: { message: 'Event is not exists', code: 422 } });
            }

            let checkEventUrl = await Event.findOne({ urlWeb: eventId });
            if (!checkEventUrl) {
                return next({ error: { message: 'Url is not exists!', code: 404 } });
            }
            eventId = await checkEventUrl._id;
            let idUser = req.user;
            Promise.all([
                ApplyEvent.findOne({ eventId: ObjectId(eventId), session: { $elemMatch: { isRefund: false } } }),
                ApplyEvent.findOne({ eventId: ObjectId(eventId), userId: ObjectId(idUser) }).populate('session.paymentId'),
                Event.findOne({ _id: ObjectId(eventId) }),
                PageEvent.findOne({ eventId: ObjectId(eventId) },
                    { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }),
            ]).then(([checkApply, ap, e, p]) => {
                if (!e) {
                    return next({ error: { message: 'Event is not exists', code: 422 } });
                }
                let result = {};

                if (editSite && (JSON.stringify(idUser) != JSON.stringify(e.userId))) {
                    next({ error: { message: 'You are not authorization' } });
                    return;
                }
                if (editSite && checkApply) {

                    if ((+(e.isEdit || 0) - (Date.now())) < 0) {
                        next({ error: { message: 'Event has user apply! Please contact with admin to resolve!', code: 700 } });
                        return;
                    }
                }

                if (ap) {
                    let eS = e.session;
                    let apS = ap.session;
                    for (let i = 0; i < apS.length; i++) {
                        let e = apS[i];
                        for (let j = 0; j < eS.length; j++) {
                            let element = eS[j];
                            if (element.id == e.id) {
                                eS[j].status = e.status;
                                eS[j].isConfirm = e.isConfirm;
                                eS[j].isReject = e.isReject;
                                eS[j].paymentId = e.paymentId;
                                eS[j].isCancel = e.isCancel;
                                break;
                            }
                        }
                    }
                    e.session = eS;

                }
                result.event = e;
                p = p || {};
                result.header = p.header || [];
                result.eventId = p.eventId;
                result.rows = editSite ? (p.rows || []) : (p.rows[index]);
                if (!p) {
                    return next({ error: { message: 'Event is not exists!', code: 500 } });
                }

                res.status(200).json({ result: result });
            }).catch(err => {
                console.log(err);
                return next({ error: { message: 'Event is not exists!', code: 600 } });
            })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    require_edit_event: async (req, res, next) => {
        let { eventId, urlWeb } = req.body;

        if (!eventId) {
            let e = await Event.findOne({ urlWeb });
            eventId = e._id;
        }
        let checkEventUrl = await Event.findById(eventId);
        if (!checkEventUrl) {
            next({ error: { message: 'Event is not exists' } });
            return;
        }
        checkEventUrl.isRequire = true;

        const newNotification = new Notification({
            sender: checkEventUrl.userId,
            receiver: [keys.adminId],
            type: "REQUIRE_EDIT",
            message: "",
            title: "{sender} has required edit for the event " + checkEventUrl.name,
            linkTo: {
                key: "EventDetail",
                _id: eventId,
                urlWeb: checkEventUrl.urlWeb
            },
            isRead: false,
            isDelete: false,
            session: []
        });

        checkEventUrl.save().then(e => {
            newNotification.save().then(e => {
                Axios.post(`https://event-admin-page.herokuapp.com/api/push_notification`,
                    { content: `${checkEventUrl.name} has required edit for the event ${checkEventUrl.name}` });
            })
            res.status(200).json({ result: true });
        }).catch(err => {
            next({ error: { message: 'Something is wrong' } });
        })

    },

    getListEvent: async (req, res, next) => {
        const token = req.cookies;

        console.log(token);

        try {
            let {
                categoryEventId,
                startDate,
                endDate,
                txtSearch,
                pageNumber,
                numberRecord,
                type,
                fee,
            } = req.query;
            type = type || '';
            pageNumber = +pageNumber || 1;
            numberRecord = +numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';
            categoryEventId = categoryEventId.split(',');
            let idUserLogin = req.user;
            let query = { 'status': 'PUBLIC', typeOfEvent: 'Public' };
            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }

            if (startDate && endDate) {
                query.session = { $elemMatch: { day: { $gt: new Date(startDate), $lt: new Date(endDate) } } };
            }



            if (fee) {
                query["ticket.price"] = { $ne: 0 }
                query.isSellTicket = { $exists: true };
                query.ticket = { $exists: true };
            } else {
                //query["ticket.price"] = { $eq: 0 }
            }

            if (categoryEventId[0]) {
                let category = { $or: [] };
                categoryEventId.forEach(e => {
                    category.$or.push({ "category": ObjectId(e) });
                });
                query.$or = category.$or;
            }

            let projectQuery = {
                'eventCategories': 1,
                'users': 1,
                name: 1,
                urlWeb: 1,
                bannerUrl: 1,
                typeOfEvent: 1,
                status: 1,
                session: 1,
                isSellTicket: 1,
                ticket: 1,
            };
            let mathQuery = {};
            let sortQuery = {};
            if (type.toString() == "HEIGHT_LIGHT") {
                projectQuery.total = { $sum: "$session.joinNumber" };
                sortQuery.total = -1;
                mathQuery.total = { $ne: 0 };
            } else {
                sortQuery.createdAt = -1;
            }
            Promise.all([
                Event.aggregate([
                    { $match: query },
                    {
                        $lookup:
                        {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "users"
                        }
                    },
                    {
                        $unwind: "$users"
                    },
                    {
                        $lookup:
                        {
                            from: "eventcategories",
                            localField: "category",
                            foreignField: "_id",
                            as: "eventCategories"
                        }
                    },
                    {
                        $unwind: "$eventCategories"
                    },
                    {
                        $project: projectQuery,

                    },
                    { $match: mathQuery },
                    { $sort: sortQuery },
                    { $skip: +numberRecord * (+pageNumber - 1) },
                    { $limit: +numberRecord }
                ]),
                Event.aggregate([
                    { $match: query },
                    {
                        $lookup:
                        {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "users"
                        }
                    },
                    {
                        $unwind: "$users"
                    },
                    {
                        $lookup:
                        {
                            from: "eventcategories",
                            localField: "category",
                            foreignField: "_id",
                            as: "eventCategories"
                        }
                    },
                    {
                        $unwind: "$eventCategories"
                    },
                    { $match: mathQuery },
                    { $group: { _id: null, total: { $sum: 1 } } },
                    {
                        $project: { total: 1 },
                    },
                ])
            ]).then(([e, count]) => {
                let c = count ? ((!count[0]) ? 0 : count[0].total) : 0;
                res.status(200).json({ result: { event: e, total: c } });
            })
        } catch (error) {
            next({ error: { message: error, code: 700 } });
        }
    },

    getListEventComingUp: async (req, res, next) => {
        try {
            let {
                categoryEventId,
                startDate,
                endDate,
                txtSearch,
                pageNumber,
                numberRecord, } = req.query;

            pageNumber = +pageNumber || 1;
            numberRecord = +numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';
            categoryEventId = categoryEventId.split(',');
            let idUserLogin = req.user;
            let query = {
                'status': 'PUBLIC', typeOfEvent: 'Public',
                'session.day': { $gt: new Date() }
            };

            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }
            if (categoryEventId[0]) {

                let category = { $or: [] };
                categoryEventId.forEach(e => {
                    category.$or.push({ "category": ObjectId(e) });
                });
                query.$or = category.$or;
            }


            let e = await Event.aggregate([
                { $match: query },
                {
                    $lookup:
                    {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "users"
                    }
                },
                {
                    $unwind: "$users"
                },
                {
                    $lookup:
                    {
                        from: "eventcategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "eventCategories"
                    }
                },
                {
                    $unwind: "$eventCategories"
                },
                { $sort: { 'session.day': 1 } },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: +numberRecord }
            ])
            res.status(200).json({ result: e });
        } catch (error) {
            next({ error: { message: 'Something is wrong!', code: 700 } });
        }
    },

    getEventInf: async (req, res, next) => {
        try {
            let {
                eventId,
                urlWeb,
            } = req.query;
            if (urlWeb) {
                let e = await Event.findOne({ urlWeb });
                if (!e) {
                    return next({ error: { message: 'Event is not Exists!' } });
                }
                eventId = e._id;
            }
            if (!eventId) {
                return next({ error: { message: 'Event is not Exists!', code: 601 } });
            }
            let idU = req.user;
            Promise.all([
                Event.aggregate(
                    [
                        { $match: { _id: ObjectId(eventId) } },
                        {
                            $lookup:
                            {
                                from: "eventcategories",
                                localField: "category",
                                foreignField: "_id",
                                as: "eventCategory"
                            }
                        },// category
                        {
                            $unwind: "$eventCategory"
                        },
                        {
                            $lookup:
                            {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "user"
                            }
                        },// user
                        {
                            $unwind: "$user"
                        },
                    ]
                ),
                Comment.countDocuments({ eventId: ObjectId(eventId) }),
                ApplyEvent.findOne({ userId: ObjectId(idU), eventId: ObjectId(eventId) }, { session: 1, _id: 0 }).populate({ path: 'session.paymentId' })
            ])
                .then(([event, countComment, sessionApply]) => {
                    console.log(event)
                    if (!event[0]) {
                        return next({ error: { message: 'Event is not Exists!', code: 700 } });
                    }
                    if (!sessionApply) {

                        //return next({ error: { message: 'you haven\'t joined event!', code: 700 } })
                    } else {
                        let eventSession = event[0].session;
                        for (let j = 0; j < sessionApply.session.length; j++) {
                            let e = sessionApply.session[j];

                            for (let i = 0; i < eventSession.length; i++) {
                                let element = eventSession[i];
                                if (element.id == e.id) {
                                    eventSession[i].status = e.status;
                                    eventSession[i].isConfirm = e.isConfirm;
                                    eventSession[i].isReject = e.isReject;
                                    eventSession[i].paymentId = e.paymentId;
                                    eventSession[i].isCancel = e.isCancel;
                                    break;
                                }
                            }
                        }
                        event[0].session = eventSession;
                    }
                    res.status(200).json({ result: { event: event[0], countComment } });

                }).catch(e => {
                    return next({ error: { message: 'Event is not Exists!', code: 700 } });
                })

        }
        catch (err) {
            next({ error: { message: 'Something is wrong!', code: 700 } });
        }
    },

    getUserJoinEvent: async (req, res, next) => {
        let {
            eventId,
            sessionId,
            pageNumber,
            numberRecord,
        } = req.query;

        pageNumber = +pageNumber || 1;
        numberRecord = +numberRecord || 10;

        if (!eventId) {
            return next({ error: { message: 'Invalid data!', code: 700 } });
        }

        let event = await Event.findById(ObjectId(eventId));

        if (!event) {
            return next({ error: { message: 'Something is wrong!' } })
        }

        let query = { eventId: new ObjectId(eventId) }

        if (sessionId) {
            if (event.isSellTicket == true) {
                query.session = { $elemMatch: { id: sessionId, isReject: false, paymentStatus: 'PAID', paymentId: { $exists: true } } };
            } else {
                query.session = { $elemMatch: { id: sessionId, isReject: false } };
            }
        } else {
            if (event.isSellTicket == true) {
                query.session = { $elemMatch: { isReject: false, paymentStatus: 'PAID', paymentId: { $exists: true } } };
            } else {
                query.session = { $elemMatch: { isReject: false } };
            }
        }

        let users = await ApplyEvent.aggregate([
            {
                $match: query
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $project: {
                    user: 1,
                    _id: 0,
                    'sessions': {
                        $filter: {
                            input: "$session",
                            as: "item",
                            cond: { $eq: ["$$item.isReject", false] }
                        }
                    }
                },

            },
            { $sort: { createdAt: -1 } },
            { $skip: +numberRecord * (+pageNumber - 1) },
            { $limit: +numberRecord },
        ]);
        if (!users) {
            return next({ error: { message: 'Something is wrong!' } })
        }

        let result = [];
        users.forEach(element => {
            result.push({ ...element.user, session: element.sessions });
        });

        res.status(200).json({ result: result });
    },

    test: async (req, res, next) => {
        let u = await User.findOne({});

        let e = await myFunction.issueJWT(u);
        res.status(200).json({ result: e });
    }

}
