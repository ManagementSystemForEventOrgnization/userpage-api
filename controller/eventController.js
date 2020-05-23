
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const myFunction = require('../utils/function');
const Event = mongoose.model('event');
const PageEvent = mongoose.model('pageEvent');

module.exports = {



    saveEvent: async (req, res, next) => {
        let { name, typeOfEvent, category, urlWeb, limitNumber, session, isSellTicket } = req.body;
        if (typeof eventName === undefined || typeof long === undefined || typeof address === undefined) {
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
            limitNumber,
            category,
            urlWeb,
            session,
            isSellTicket
        }
        );

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
        let { block, eventId, isPreview, header } = req.body;

        try {
            //unEditableHtml[0].innerHtml = hm.compress(unEditableHtml[0].innerHtml);
            eventId = eventId || '';
            let idUser = req.user;
            Promise.all([
                Event.findByIdAndUpdate({ _id: ObjectId(eventId), userId: ObjectId(idUser) }, { isPreview: isPreview }),
                PageEvent.find({ eventId })
            ])
                .then(async ([e, pageEvent]) => {

                    if (!e) {
                        next({ error: { message: 'Event not exists', code: 300 } });
                    }

                    let Header = [];
                    Header.push(header);

                    if (pageEvent[0]) {
                        // xác nhận là đã lưu trước đó. chỉ cần update lại.

                        let _id = pageEvent[0]._id;
                        let p = await PageEvent.findByIdAndUpdate({ _id: ObjectId(_id) }, { rows: block, updateAt: new Date(), Header });
                        if (!p) {
                            return next({ error: { message: 'Event is not exists', code: 422 } });
                        }
                    } else {
                        let page = new PageEvent(
                            {
                                eventId: eventId,
                                rows: block,
                                header: Header
                            }
                        );
                        let p = await page.save();
                        if (!p) {
                            return next({ error: { message: 'Invalid data, can\'t save data', code: 422 } });
                        }
                    }
                    res.status(200).json({ result: 'success' })
                }).catch(() => {
                    return next({ error: { message: 'Something is wrong', code: 300 } });
                })
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    getPageEvent: async (req, res, next) => {
        let { eventId, route } = req.query;
        route = route || 'home';
        try {
            if (!eventId) {
                return next({ error: { message: 'Event is not exists', code: 422 } });
            }
            let page = await PageEvent.find({ eventId: new ObjectId(eventId), 'rows.route': route });

            if (!page[0]) {
                return next({ error: { message: 'Event is not exists', code: 500 } });
            }
            res.status(200).json({ result: page });
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }
    },

    getPageEventEdit: async (req, res, next) => {
        let { eventId } = req.query;
        try {
            if (!eventId) {
                return next({ error: { message: 'Event is not exists', code: 422 } });
            }
            let idUser = req.user;
            Promise.all([
                PageEvent.find({ eventId: new ObjectId(eventId) }, { unEditableHtml: 0 }),
                Event.findOne({ userId: new ObjectId(idUser) })
            ])
                .then(([page, event]) => {
                    if (!event) {
                        return next({ error: { message: 'Event not EXISTS!', code: 300 } });
                    }

                    if (!page) {
                        return next({ error: { message: 'Event is not exists', code: 500 } });
                    }
                    res.status(200).json({ result: page });
                }).catch(([p, e]) => {
                    next({ error: { message: 'Something is wrong!', code: 400 } });
                })
        } catch (error) {
            next({ error: { message: error, code: 500 } })
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

    getListEvent : async(req,res,next)=>{
        let {categoryEventId,
            startDate,
            endDate,
            txtSearch,
            pageNumber,
            numberRecord, }= req.query;
        let e = await Event.find({});
        return next({error: {message: 'loi'}});
        res.status(200).json({result: e});
    }


}