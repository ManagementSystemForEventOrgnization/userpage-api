
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const myFunction = require('../utils/function');
const Event = mongoose.model('event');
const PageEvent = mongoose.model('pageEvent');

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

            let p = await PageEvent.findOne({ eventId: new ObjectId(eventId) }, { _id: 0, __v: 0, createAt: 0, updateAt: 0 });
            console.log(p);
            //let page = await PageEvent.find({ eventId: new ObjectId(eventId), 'rows.route': route });
            let result = {};
            result.header = p.header;
            result.eventId = p.eventId;
            result.rows = p.rows[index];
            if (!p) {
                return next({ error: { message: 'Event is not exists', code: 500 } });
            }
            res.status(200).json({ result: result });
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
                txtSearch,
                pageNumber,
                numberRecord, } = req.query;

            pageNumber = pageNumber || 1;
            numberRecord = numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';

            let idUserLogin = req.user;
            let query = { 'status': { $nin: ["CANCEL", "DRAFT"] } };
            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }

            if (categoryEventId != "") {
                query.category = categoryEventId
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
                // {$project: { 'users.fullName': 1 }},
                {
                    $unwind: "$eventCategories"
                },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: numberRecord },
                { $sort: { createdAt: 1 } }
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

            pageNumber = pageNumber || 1;
            numberRecord = numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';

            let idUserLogin = req.user;
            let query = { 'status': { $nin: ["CANCEL", "DRAFT"] } };

            if (txtSearch != "") {
                query.$text = { $search: txtSearch };
            }

            if (categoryEventId != "") {
                query.category = categoryEventId
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
                // {$project: { 'users.fullName': 1 }},
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
                // {$project: { 'users.fullName': 1 }},
                {
                    $unwind: "$eventCategories"
                },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: +numberRecord },
                { $sort: { 'session.day': 1 } }
            ])
            console.log("Tcl:", e);
            res.status(200).json({ result: e });
        } catch (error) {
            next({ error: { message: 'Something is wrong!', code: 700 } });
        }
    },

    getListEventStart: async (req, res, next) => {
        try {
            let {
                categoryEventId,
                startDate,
                endDate,
                txtSearch,
                pageNumber,
                numberRecord, } = req.query;

            pageNumber = pageNumber || 1;
            numberRecord = numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';

            let idUserLogin = req.user;
            let query = { 'status': 'START', userId: idUserLogin };
            // if (txtSearch != "") {
            //     query.$text = { $search: txtSearch };
            // }

            if (categoryEventId != "") {
                query.category = categoryEventId
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
                // {$project: { 'users.fullName': 1 }},
                {
                    $unwind: "$users"
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

    getListEventDraft: async (req, res, next) => {
        try {
            let {
                categoryEventId,
                startDate,
                endDate,
                txtSearch,
                pageNumber,
                numberRecord, } = req.query;

            pageNumber = pageNumber || 1;
            numberRecord = numberRecord || 10;
            txtSearch = txtSearch || '';
            categoryEventId = categoryEventId || '';

            let idUserLogin = req.user;
            let query = { 'status': 'DRAFT', userId: idUserLogin };
            // if (txtSearch != "") {
            //     query.$text = { $search: txtSearch };
            // }

            if (categoryEventId != "") {
                query.category = categoryEventId
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
                // {$project: { 'users.fullName': 1 }},
                {
                    $unwind: "$users"
                },
                { $skip: +numberRecord * (+pageNumber - 1) },
                { $limit: numberRecord },
                { $sort: { 'session.day': 1 } }
            ])
            res.status(200).json({ result: e });
        } catch (error) {
            next({ error: { message: 'Something is wrong!', code: 700 } });
        }
    },


}
