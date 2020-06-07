
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const myFunction = require('../utils/function');
const Event = mongoose.model('event');
const PageEvent = mongoose.model('pageEvent');
const Comment = mongoose.model('comment');
const ApplyEvent = mongoose.model('applyEvent');

module.exports = {

    saveEvent: async (req, res, next) => {
        let { name, typeOfEvent, category, urlWeb, session, isSellTicket, banner } = req.body;
        if (!name || !session) {
            return next({ error: { message: 'Invalid value', code: 602 } });
        }
        console.log(banner);
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
            urlWeb,
            session,
            isSellTicket,
            bannerUrl: banner
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

                    Promise.all([
                        Event.findByIdAndUpdate({ _id: ObjectId(_idE) }, { isPreview: isPreview }),
                        PageEvent.findByIdAndUpdate({ _id: ObjectId(_id) }, { rows: blocks, updateAt: new Date(), header })
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

                    Promise.all([
                        Event.findByIdAndUpdate({ _id: ObjectId(_idE) }, { isPreview: isPreview }),
                        page.save()
                    ]).then(([e, pe]) => {
                        if (!p) {
                            return next({ error: { message: 'Invalid data, can\'t save data', code: 422 } });
                        }
                    })

                    // let p = await page.save();
                    // if (!p) {
                    //     return next({ error: { message: 'Invalid data, can\'t save data', code: 422 } });
                    // }
                }
                res.status(200).json({ result: 'success' })
            }).catch((err) => {
                console.log(err);
                return next({ error: { message: 'Something is wrong', code: 300 } });
            })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    getPageEvent: async (req, res, next) => {
        let { eventId, index } = req.query; // eventId, index: 0,1,2,3,4
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
                ApplyEvent.findOne({ eventId: ObjectId(eventId), userId: ObjectId(idUser) }),
                Event.findOne({ _id: ObjectId(eventId) }),
                PageEvent.findOne({ eventId: new ObjectId(eventId) }, { _id: 0, __v: 0, createAt: 0, updateAt: 0 })
            ]).then(([ap, e, p]) => {

                if (!e) {
                    return next({ error: { message: 'Event is not exists', code: 422 } });
                }
                let result = {};

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
                result.rows = p.rows[index] || {};

                if (!p) {
                    return next({ error: { message: 'Event is not exists!', code: 500 } });
                }

                res.status(200).json({ result: result });
            }).catch(err => {
                return next({ error: { message: 'Event is not exists!', code: 700 } });
            })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    test: async (req, res, next) => {
        myFunction.funcPromiseAll([Event.find({}), Event.find({}), (() => { return Promise.reject('err') }).call()])
            .then(val => {
                console.log(val);
                res.json(val);
            }).catch(e => {
                res.json(e);
            })

    },

    getListEvent: async (req, res, next) => {
        try {
            let {
                categoryEventId,
                startDate,
                endDate,
                fee,
                txtSearch,
                pageNumber,
                numberRecord,
                type
            } = req.query;
            type = type || '';
            pageNumber = +pageNumber || 1;
            numberRecord = +numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';
            categoryEventId = categoryEventId.split(',');
            let idUserLogin = req.user;
            let query = { 'status': { $nin: ["CANCEL", "DRAFT"] } };
            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }
            if (fee) {
                query.isSellTicket = { $exists: true };
                query.ticket = { $exists: true };
                query["ticket.price"] = { $ne: 0 }

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
                ticket: 1
            };
            let mathQuery = {};
            let sortQuery = {};
            if (type.toString() == "HEIGHT_LIGHT") {
                projectQuery.total = { $sum: "$session.joinNumber" };
                sortQuery.total = -1;
                mathQuery.total = { $ne: 0 };
            } else {
                sortQuery.createAt = -1;
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
                {
                    $project: projectQuery
                },
                { $match: mathQuery },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: +numberRecord },
                { $sort: { 'total': -1 } }
            ]);
            res.status(200).json({ result: e });
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
                'status': { $nin: ["CANCEL", "DRAFT"] },
                'session.day': { $gt: new Date() }
            };

            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }



            // if (categoryEventId != "") {
            //     query.category = categoryEventId
            // }
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
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: +numberRecord },
                { $sort: { 'session.day': 1 } }
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
                        },
                        {
                            $unwind: "$eventCategory"
                        },
                    ]
                ),
                Comment.countDocuments({ eventId: ObjectId(eventId) }),
                ApplyEvent.findOne({ userId: ObjectId(idU), eventId: ObjectId(eventId) }, { session: 1, _id: 0 })
            ])
                .then(([event, countComment, sessionApply]) => {
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

        if (!eventId || !sessionId) {
            return next({ error: { message: 'Invalid data!', code: 700 } });
        }

        let users = await ApplyEvent.aggregate([
            { $match: { 'session.id': sessionId, eventId: ObjectId(eventId) } },
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
            { $project: { user: 1, _id: 0 } },
            { $skip: +numberRecord * (+pageNumber - 1) },
            { $limit: +numberRecord },
        ]);

        if (!users) {
            return next({ error: { message: 'Something is wrong!' } })
        }

        let result = [];
        users.forEach(element => {
            result.push(element.user);
        });
        res.status(200).json({ result: result });
    },

    test: async (req, res, next) => {
        let e = await PageEvent.find({ 'eventId': { $type: 'objectId' } }).populate('eventId');
        res.status(200).json(e);
    },

}